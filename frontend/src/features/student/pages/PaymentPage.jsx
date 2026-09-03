import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getExamsApi, getFormStatusApi, createRazorpayOrderApi, verifyRazorpayPaymentApi, recordPaymentSuccessApi } from '../api/studentApi';
import { AlertCircle, User, CreditCard, Pin, Loader2, Lock, Shield, CheckCircle2, Zap } from 'lucide-react';

export default function PaymentPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { student, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  
  const [exam, setExam] = useState(null);
  const [formDetails, setFormDetails] = useState(null);
  
  const [feeBreakdown, setFeeBreakdown] = useState({
    baseFee: 1500,
    subjectFee: 0,
    subjectFeeLabel: '',
    subjectCount: 0,
    lateFee: 0,
    total: 1500,
    isLate: false
  });

  useEffect(() => {
    // Fetch data
    const fetchData = async () => {
      try {
        const [examsRes, statusRes] = await Promise.all([
          getExamsApi(),
          getFormStatusApi()
        ]);

        const currentForm = statusRes.find(f => String(f.form_id) === String(formId));
        if (!currentForm) {
          setError('Exam form record not found.');
          setLoading(false);
          return;
        }

        if (currentForm.payment_status === 'paid') {
          navigate(`/form/${formId}/success`, { replace: true });
          return;
        }

        const currentExam = examsRes.find(e => String(e.exam_id) === String(currentForm.exam_id));
        setFormDetails(currentForm);
        setExam(currentExam);

        // Calculate subject and late fees based on exam type
        if (currentExam) {
          const base = currentExam.form_fees || 0;
          const examType = (currentExam.exam_type || '').toLowerCase().trim();
          const subjectCount = Number(currentForm.subject_count) || 0;

          let subjectFee = 0;
          let subjectFeeLabel = '';

          if (examType === 'atkt' || examType.includes('kt')) {
            if (subjectCount <= 3) {
              subjectFee = subjectCount * 500;
              subjectFeeLabel = `ATKT Subject Fee (${subjectCount} subject(s) @ ₹500)`;
            } else {
              subjectFee = 1850;
              subjectFeeLabel = `ATKT Subject Fee (${subjectCount} subjects - Flat rate >3 subjects)`;
            }
          } else if (examType === 'supplementary' || examType === 'supplymentry') {
            subjectFee = subjectCount * 500;
            subjectFeeLabel = `Supplementary Subject Fee (${subjectCount} subject(s) @ ₹500)`;
          }

          let late = 0;
          let isLate = false;
          
          const today = new Date();
          const deadline = new Date(currentExam.deadline_date);
          deadline.setHours(23, 59, 59, 999);

          if (today > deadline) {
            late = currentExam.late_fees || 500;
            isLate = true;
          }

          setFeeBreakdown({
            baseFee: base,
            subjectFee,
            subjectFeeLabel,
            subjectCount,
            lateFee: late,
            total: base + subjectFee + late,
            isLate
          });
        }
      } catch (err) {
        setError('Failed to load payment details. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId, navigate]);

  // Load Razorpay Checkout SDK if not already in document
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePayment = async () => {
    setPaying(true);
    setError('');

    try {
      // 1. Create real order on backend using Razorpay API
      const orderData = await createRazorpayOrderApi(parseInt(formId, 10));

      if (!window.Razorpay) {
        setError('Razorpay SDK is loading. Please click Pay again in 2 seconds.');
        setPaying(false);
        return;
      }

      // 2. Configure Razorpay Checkout options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount_in_paise,
        currency: orderData.currency || 'INR',
        name: 'TCET Examination Cell',
        description: `${exam?.exam_name || 'Examination Application'} • Form #${formId}`,
        image: '/src/images/tcetlogo.png',
        order_id: orderData.order_id,
        prefill: {
          name: student?.full_name || '',
          email: student?.email || '',
          contact: '9876543210'
        },
        notes: {
          form_id: String(formId),
          exam_code: exam?.exam_code || '',
          student_id: String(student?.student_id || '')
        },
        theme: {
          color: '#002147'
        },
        handler: async function (response) {
          setLoading(true);
          try {
            await verifyRazorpayPaymentApi({
              form_id: parseInt(formId, 10),
              razorpay_order_id: response.razorpay_order_id || orderData.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            navigate(`/form/${formId}/success`);
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed. Please contact exam cell.');
            setLoading(false);
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(`Payment failed: ${response.error?.description || 'Transaction declined by bank'}`);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay payment initialization error:', err);
      setError(err.response?.data?.message || 'Failed to initialize payment gateway.');
      setPaying(false);
    }
  };

  const handleQuickBypass = async () => {
    setLoading(true);
    setError('');
    try {
      const simPaymentId = `pay_sim_${Date.now()}`;
      await recordPaymentSuccessApi(parseInt(formId, 10), simPaymentId);
      navigate(`/form/${formId}/success`);
    } catch (err) {
      setError(err.response?.data?.message || 'Quick simulation bypass failed.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-wrapper">
          <div className="loading-state">
            <div className="spinner" />
            <p>Preparing secure checkout gateway…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '2rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className="step done">
              <div className="step-circle">✓</div>
              <span className="step-label">Fill Form</span>
            </div>
            <div className="step-line" />
            <div className="step active">
              <div className="step-circle">2</div>
              <span className="step-label">Pay Fees</span>
            </div>
            <div className="step-line" />
            <div className="step">
              <div className="step-circle">3</div>
              <span className="step-label">Submit & PDF</span>
            </div>
          </div>

          <div className="page-header" style={{ textAlign: 'center' }}>
            <h1 className="page-title" style={{ fontSize: '1.6rem' }}>Verify & Pay Fees</h1>
            <p className="page-subtitle">Form ID: #{formId} • {exam?.exam_name}</p>
          </div>

          {error && (
            <div className="alert error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div className="glass-card animate-fadeInUp">
            
            {/* Student Information Section */}
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={18} /> Student Profile</div>
            <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.5rem', gap: '0.85rem' }}>
              <div className="info-item">
                <span className="info-label">Full Name</span>
                <span className="info-value">{student?.full_name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Program Category</span>
                <span className="info-value">{student?.category}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Exam Code</span>
                <span className="info-value" style={{ color: 'var(--purple-light)', fontWeight: 700 }}>
                  {exam?.exam_code}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Exam Type</span>
                <span className="info-value" style={{ textTransform: 'uppercase', fontWeight: 700 }}>{exam?.exam_type}</span>
              </div>
            </div>

            {/* Fee Breakdown Receipt Section */}
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={18} /> Fee Payment Breakdown</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                <span>Base Application Form Fee</span>
                <span style={{ fontWeight: 600 }}>INR {feeBreakdown.baseFee}.00</span>
              </div>

              {feeBreakdown.subjectFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: '#1e40af', fontWeight: 600 }}>
                  <span>{feeBreakdown.subjectFeeLabel}</span>
                  <span>+ INR {feeBreakdown.subjectFee}.00</span>
                </div>
              )}

              {feeBreakdown.isLate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: 'var(--red)', fontWeight: 600 }}>
                  <span>Late Fee Applied (Deadline: {new Date(exam?.deadline_date).toLocaleDateString()})</span>
                  <span>+ INR {feeBreakdown.lateFee}.00</span>
                </div>
              )}

              <div className="divider" style={{ margin: '0.5rem 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#002147' }}>
                <span>Total Amount Due</span>
                <span>INR {feeBreakdown.total}.00</span>
              </div>
            </div>

            {/* Warning Alert if Late */}
            {feeBreakdown.isLate && (
              <div className="alert error" style={{ fontSize: '0.82rem', marginBottom: '1.5rem', padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pin size={16} /> Note: The standard application deadline of <strong>{new Date(exam?.deadline_date).toLocaleDateString()}</strong> has passed. A late fee is appended.
              </div>
            )}

            {/* Checkout Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-full btn-lg"
                onClick={handlePayment}
                disabled={paying}
                style={{ background: '#002147', borderRadius: '4px', fontWeight: 700, fontSize: '0.95rem' }}
              >
                {paying ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 className="animate-spin" size={18} /> Opening Razorpay Gateway…
                  </span>
                ) : (
                  `Pay INR ${feeBreakdown.total}.00 via Razorpay`
                )}
              </button>

              {/* Demo / Test Bypass Shortcut Button */}
              <button
                type="button"
                onClick={handleQuickBypass}
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  borderRadius: '4px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#1e40af'; e.currentTarget.style.background = '#eff6ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#f8fafc'; }}
              >
                <Zap size={14} color="#f59e0b" /> Skip / Simulate Payment Success (Demo Mode)
              </button>

              <Link
                to="/dashboard"
                className="btn btn-ghost btn-full"
                style={{ fontSize: '0.9rem' }}
              >
                Cancel and Return
              </Link>
            </div>

          </div>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <Lock size={12} /> Secured by Razorpay Payment Gateway (Test Mode)
          </p>

        </div>
      </div>
    </Layout>
  );
}
