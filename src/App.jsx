import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import About from './components/About';
import Resources from './components/Resources';
import Pronunciation from './components/Pronunciation';
import Blog from './components/Blog';
import BlogPost from './components/BlogPost';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import { useLanguage } from './context/LanguageContext';

import ServicePage from './components/ServicePage';

// Page principale (one-page)
const HomePage = () => (
    <div className="App">
        <div className="watermark-bg"></div>
        <Header />
        <main>
            <Hero />
            <About />
            <Services />
            <Resources />
            <Pronunciation />
            <Blog />
            <Testimonials />
            <Contact />
        </main>
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/service/:slug" element={<ServicePage />} />
                {/* Toute autre URL → page d'accueil */}
                <Route path="*" element={<HomePage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;