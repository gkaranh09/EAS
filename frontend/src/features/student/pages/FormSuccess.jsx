import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Layout from '../../../layouts/Layout.jsx';
import { getFormStatusApi, downloadPdfApi } from '../api/studentApi';
import { Check, Loader2, FileText } from 'lucide-react';

export default function FormSuccess() {
  const { formId }  = useParams();
  const navigate    = useNavigate();
  const { student, token } = useAuth();

  const [formData, setFormData]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    getFormStatusApi()
      .then(data => {
        const found = data.find(f => String(f.form_id) === String(formId));
        setFormData(found || null);
      })
      .catch(() => setFormData(null))
      .finally(() => setLoading(false));
  }, [formId]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const data = await downloadPdfApi(formId, token);
      const url  = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `ExamForm_${formId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('PDF download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-wrapper">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading form details…</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-wrapper">
        <div className="container" style={{ maxWidth: '560px' }}>

          {/* Step Indicator */}
          <div className="step-indicator">
            <div className="step done">
              <div className="step-circle">✓</div>
              <span className="step-label">Fill Form</span>
            </div>
            <div className="step-line" />
            <div className="step done">
              <div className="step-circle">✓</div>
              <span className="step-label">Pay Fees</span>
            </div>
            <div className="step-line" />
            <div className="step active">
              <div className="step-circle">3</div>
              <span className="step-label">Print Form</span>
            </div>
          </div>

          <div className="glass-card animate-fadeInUp">
            {/* Success Icon */}
            <div className="success-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Check size={40} strokeWidth={3} />
            </div>

            <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Application Submitted!
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '2rem' }}>
              Your exam form has been successfully recorded. Download your PDF for reference.
            </p>

            {/* Form Details */}
            <div style={{ background: 'rgba(0,33,71,0.06)', border: '1px solid rgba(0,33,71,0.15)',
                          borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
              <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="info-item">
                  <span className="info-label">Form ID</span>
                  <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700 }}>
                    #{formId}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Student</span>
                  <span className="info-value">{student?.full_name}</span>
                </div>
                {formData && (
                  <>
                    <div className="info-item">
                      <span className="info-label">Exam</span>
                      <span className="info-value">{formData.exam_name}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Payment Status</span>
                      <span className={`status-badge ${formData.payment_status === 'paid' ? 'applied' : 'pending'}`}>
                        {formData.payment_status}
                      </span>
                    </div>
                    {formData.razorpay_payment_id && (
                      <div className="info-item">
                        <span className="info-label">Payment ID</span>
                        <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all' }}>
                          {formData.razorpay_payment_id}
                        </span>
                      </div>
                    )}
                    {formData.amount_paid && (
                      <div className="info-item">
                        <span className="info-label">Amount Paid</span>
                        <span className="info-value" style={{ fontWeight: 700 }}>
                          INR {formData.amount_paid}.00
                        </span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">Applied On</span>
                      <span className="info-value" style={{ fontSize: '0.85rem' }}>
                        {new Date(formData.applied_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                id="download-pdf-btn"
                className="btn btn-primary btn-full btn-lg"
                onClick={handleDownloadPdf}
                disabled={downloading}
                style={{ background: '#002147', borderRadius: '4px', fontWeight: 700 }}
              >
                {downloading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 className="animate-spin" size={18} /> Generating PDF…
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} /> Download PDF Form
                  </span>
                )}
              </button>

              <Link
                to="/dashboard"
                id="back-dashboard-btn"
                className="btn btn-ghost btn-full"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '1.25rem' }}>
            Keep your Form ID <strong style={{ color: 'var(--purple-light)' }}>#{formId}</strong> for future reference.
          </p>
        </div>
      </div>
    </Layout>
  );
}
