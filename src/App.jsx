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
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Resources />
        <Testimonials />
        <Contact />
      </main>
    </div>
  );
}

export default App;
