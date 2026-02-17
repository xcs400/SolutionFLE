import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import About from './components/About';
import Resources from './components/Resources';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import { motion } from 'framer-motion';
import { useLanguage } from './context/LanguageContext';

function App() {
  const { t } = useLanguage();

  return (
    <div className="App">
      <div className="watermark-bg"></div>
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Resources />
        <Testimonials />
        <Contact />
      </main>

      {/* Floating Action Button for Mobile */}
      <motion.a
        href="tel:+33649163537"
        className="fixed-fab"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: 'spring' }}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: '#25d366', // Whatsapp green or secondary
          color: 'white',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          zIndex: 999
        }}
        title={t('app.call_now')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </motion.a>
    </div>
  );
}

export default App;
