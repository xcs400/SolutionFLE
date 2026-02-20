import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

const ContactForm = () => {
    const { t } = useLanguage();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
    });

    const [status, setStatus] = useState({
        type: 'idle', // idle, loading, success, error
        message: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
            setStatus({
                type: 'error',
                message: t('contact.error_fields'),
            });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setStatus({
                type: 'error',
                message: t('contact.error_email'),
            });
            return;
        }

        setStatus({
            type: 'loading',
            message: t('contact.sending_progress'),
        });

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || t('contact.error_send'));
            }

            setStatus({
                type: 'success',
                message: t('contact.success'),
            });

            setFormData({ name: '', email: '', message: '' });

            // Reset status after 6 seconds
            setTimeout(() => {
                setStatus({ type: 'idle', message: '' });
            }, 6000);
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.message || t('contact.error_generic'),
            });
        }
    };

    return (
        <motion.div
            className="card"
            style={{ padding: '3rem' }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
        >
            <h3 style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <EditableText tag="span" translationKey="contact.form_title">{t('contact.form_title')}</EditableText>
            </h3>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">
                        <EditableText tag="span" translationKey="contact.label_name">{t('contact.label_name')}</EditableText>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={t('contact.placeholder_name')}
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <EditableText tag="span" translationKey="contact.label_email">{t('contact.label_email')}</EditableText>
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t('contact.placeholder_email')}
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <EditableText tag="span" translationKey="contact.label_message">{t('contact.label_message')}</EditableText>
                    </label>
                    <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={t('contact.placeholder_message')}
                        rows={5}
                        className="form-control"
                        style={{ resize: 'none' }}
                    />
                </div>

                <AnimatePresence>
                    {status.type !== 'idle' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div className={`status-box status-${status.type}`}>
                                {status.type === 'success' && <CheckCircle size={20} />}
                                {status.type === 'error' && <AlertCircle size={20} />}
                                {status.type === 'loading' && <Loader2 size={20} className="animate-spin" />}
                                <span>{status.message}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    type="submit"
                    className="btn"
                    disabled={status.type === 'loading'}
                    style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                >
                    {status.type === 'loading' ? t('contact.sending') : (
                        <>
                            <Send size={20} style={{ marginRight: '10px' }} />
                            <EditableText tag="span" translationKey="contact.submit">{t('contact.submit')}</EditableText>
                        </>
                    )}
                </button>
            </form>
        </motion.div>
    );
};

export default ContactForm;
