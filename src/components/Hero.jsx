import React from 'react';
import { motion } from 'framer-motion';

const Hero = () => {
    return (
        <section id="home" className="hero">
            <div className="hero-content">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1 }}
                    style={{ marginBottom: '2rem' }}
                >
                    <img
                        src="./Picture2.png"
                        alt="Solution FLE Logo"
                        style={{ height: '140px', width: 'auto' }}
                    />
                </motion.div>

                <motion.h1
                    className="hero-title"
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    Apprendre le français<br />
                    <span style={{ color: 'var(--color-secondary)' }}>et tout devient possible</span>
                </motion.h1>

                <motion.p
                    className="hero-subtitle"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    style={{ fontWeight: '400', maxWidth: '700px', margin: '2rem auto 3rem', fontSize: '1.4rem' }}
                >
                    Formations personnalisées en Français Langue Étrangère (FLE)<br />
                    avec <strong>Aline Gamblin</strong>, professeure diplômée DAEFLE.
                </motion.p>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                    style={{ position: 'relative' }}
                >
                    <a href="#services" className="btn">
                        Découvrir les formations
                    </a>
                </motion.div>

                {/* Animated Showcase - Cycling Images Sequential */}
                <div style={{ marginTop: '4rem', position: 'relative', height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                    {[
                        { src: './Firefly1.png', delay: 0 },
                        { src: './Firefly2.png', delay: 4 },
                        { src: './tableau.png', delay: 8 }
                    ].map((img, index) => (
                        <motion.div
                            key={index}
                            initial={{ x: -250, opacity: 0 }}
                            animate={{
                                x: [-250, 0, 0, 250],
                                opacity: [0, 1, 1, 0]
                            }}
                            transition={{
                                duration: 4,
                                times: [0, 0.2, 0.8, 1],
                                repeat: Infinity,
                                repeatDelay: 8, // Total cycle 12s
                                delay: img.delay,
                                ease: "easeInOut"
                            }}
                            style={{
                                position: 'absolute',
                                width: '100%',
                                maxWidth: '280px'
                            }}
                        >
                            <div
                                style={{
                                    borderRadius: '15px',
                                    overflow: 'hidden',
                                    boxShadow: '0 15px 35px rgba(11, 24, 109, 0.15)',
                                    border: '5px solid white',
                                    transform: index % 2 === 0 ? 'rotate(-2deg)' : 'rotate(2deg)'
                                }}
                            >
                                <img
                                    src={img.src}
                                    alt={`Visuel FLE ${index + 1}`}
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Clean Background - no more masking squares */}
        </section>
    );
};

export default Hero;
