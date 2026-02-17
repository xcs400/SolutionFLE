import React from 'react';
import { motion } from 'framer-motion';

const About = () => {
    return (
        <section id="about" className="section section-alt">
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    style={{ position: 'relative' }}
                >
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '-20px',
                        width: '100px',
                        height: '100px',
                        background: 'var(--color-yellow)',
                        zIndex: 0,
                        borderRadius: '20px',
                        opacity: 0.2
                    }}></div>
                    <img
                        src="./IMG_6329.jpg"
                        alt="Aline Gamblin"
                        style={{
                            width: '100%',
                            borderRadius: '30px',
                            boxShadow: '20px 20px 60px rgba(0,0,0,0.1)',
                            position: 'relative',
                            zIndex: 1
                        }}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 style={{ textAlign: 'left', marginBottom: '2rem' }}>Mon Parcours</h2>
                    <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Aline GAMBLIN</h3>
                    <p style={{ color: 'var(--color-secondary)', fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                        Professeure de FLE diplômée DAEFLE
                    </p>
                    <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                        Passionnée par la transmission de la langue et de la culture française, j'accompagne depuis plusieurs années
                        un public international varié dans sa quête de maîtrise linguistique.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        {[
                            'Enseignement sur-mesure et flexible',
                            'Immersion culturelle et ateliers pratiques',
                            'Pédagogie active centrée sur l’apprenant',
                            'Accompagnement bienveillant et structuré'
                        ].map((text, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: 'var(--color-yellow)'
                                }}></div>
                                <span style={{ fontWeight: '500' }}>{text}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default About;
