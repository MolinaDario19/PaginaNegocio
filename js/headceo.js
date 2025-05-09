const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Digital Electronics",
    "image": "https://digitalelectronics.vercel.app/images/img_main.jpeg",
    "url": "https://digitalelectronics.vercel.app/",
    "telephone": "+57 3103841388",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Cali",
      "addressRegion": "Valle del Cauca",
      "addressCountry": "CO"
    },
    "email": "digitalelectronicscslic@gmail.com",
    "sameAs": [
        "https://www.facebook.com/digielec",
        "https://www.instagram.com/digitalelectronics_cali",
        "https://www.tiktok.com/@digitalelectronicscali",
        "https://youtube.com/@digitalelectronics6530",
        "https://wa.me/573103841388"
    ],
    "openingHours": "Mo-Sa 08:00-18:00"
  };
  
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(jsonLd);
  document.head.appendChild(script);
  