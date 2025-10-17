import React, { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { Loader2 } from 'lucide-react';

interface Website {
  id: number;
  title: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  grapesHtml?: string;
  grapesCss?: string;
  grapesJs?: string;
  customCss?: string;
  customJs?: string;
  customHead?: string;
  favicon?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  status: string;
}

const PublicWebsite: React.FC = () => {
  const [, params] = useRoute('/:slug');
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = params?.slug;

  useEffect(() => {
    if (!slug) {
      setError('No slug provided');
      setLoading(false);
      return;
    }


    const appRoutes = [
      'auth', 'login', 'register', 'dashboard', 'admin', 'settings',
      'profile', 'logout', 'inbox', 'flows', 'contacts', 'calendar',
      'analytics', 'campaigns', 'pipeline', 'pages', 'users', 'billing',
      'integrations', 'reports', 'templates', 'webhooks', 'payment',
      'forgot-password', 'reset-password', 'signup', 'affiliate-apply',
      'become-partner', 'accept-invitation'
    ];

    if (appRoutes.includes(slug)) {
      setError('App route');
      setLoading(false);
      return;
    }

    fetchWebsite(slug);
  }, [slug]);

  const fetchWebsite = async (websiteSlug: string) => {
    try {
      const response = await fetch(`/api/public/website/${websiteSlug}`);
      
      if (response.status === 404) {
        setError('Website not found');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch website');
      }

      const websiteData = await response.json();
      
      if (websiteData.status !== 'published') {
        setError('Website not published');
        setLoading(false);
        return;
      }

      setWebsite(websiteData);
      

      if (websiteData.metaTitle || websiteData.title) {
        document.title = websiteData.metaTitle || websiteData.title;
      }


      if (websiteData.metaDescription) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', websiteData.metaDescription);
      }


      if (websiteData.metaKeywords) {
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', websiteData.metaKeywords);
      }


      if (websiteData.favicon) {
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.setAttribute('rel', 'icon');
          document.head.appendChild(favicon);
        }
        favicon.href = websiteData.favicon;
      }


      if (websiteData.customHead) {
        const headDiv = document.createElement('div');
        headDiv.innerHTML = websiteData.customHead;
        Array.from(headDiv.children).forEach(child => {
          document.head.appendChild(child);
        });
      }


      if (websiteData.googleAnalyticsId) {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${websiteData.googleAnalyticsId}`;
        document.head.appendChild(gaScript);

        const gaConfig = document.createElement('script');
        gaConfig.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${websiteData.googleAnalyticsId}');
        `;
        document.head.appendChild(gaConfig);
      }


      if (websiteData.facebookPixelId) {
        const fbScript = document.createElement('script');
        fbScript.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${websiteData.facebookPixelId}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(fbScript);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching website:', err);
      setError('Failed to load website');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (website) {

      if (website.grapesCss || website.customCss) {
        const style = document.createElement('style');
        style.innerHTML = `${website.grapesCss || ''}\n${website.customCss || ''}`;
        document.head.appendChild(style);

        return () => {
          document.head.removeChild(style);
        };
      }
    }
  }, [website]);

  useEffect(() => {
    if (website && website.grapesJs) {

      const script = document.createElement('script');
      script.innerHTML = `${website.grapesJs}\n${website.customJs || ''}`;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [website]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error === 'App route') {

    return null;
  }

  if (error || !website) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-gray-600 mb-8">Page Not Found</p>
        <p className="text-sm text-gray-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      dangerouslySetInnerHTML={{ __html: website.grapesHtml || '' }}
    />
  );
};

export default PublicWebsite;
