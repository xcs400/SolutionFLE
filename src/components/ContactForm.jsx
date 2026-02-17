import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const ContactForm = () => {
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
                message: 'Veuillez remplir tous les champs',
            });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setStatus({
                type: 'error',
                message: 'Veuillez entrer une adresse email valide',
            });
            return;
        }

        setStatus({
            type: 'loading',
            message: 'Envoi en cours...',
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
                throw new Error(errorData.error || "Erreur lors de l'envoi");
            }

            setStatus({
                type: 'success',
                message: 'Merci ! Votre message a été envoyé avec succès. Je vous recontacterai très bientôt.',
            });

            setFormData({ name: '', email: '', message: '' });

            // Reset status after 6 seconds
            setTimeout(() => {
                setStatus({ type: 'idle', message: '' });
            }, 6000);
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.message || "Une erreur est survenue. Veuillez réessayer ou m'appeler directement.",
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
            <h3 style={{ marginBottom: '2.5rem', textAlign: 'center' }}>Envoyez-moi un message</h3>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Votre nom</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Jean Dupont"
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Votre email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="jean@exemple.com"
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Votre message</label>
                    <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Décrivez vos objectifs d'apprentissage..."
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
                    {status.type === 'loading' ? 'Envoi...' : (
                        <>
                            <Send size={20} style={{ marginRight: '10px' }} />
                            Envoyer le message
                        </>
                    )}
                </button>
            </form>
        </motion.div>
    );
};

export default ContactForm;
