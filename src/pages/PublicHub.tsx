import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import hubBackground from "@/assets/hub-background.jpg";
import CallHectorUI from "@/components/dashboard/CallHectorUI";

const PublicHub = () => {
  const { slug } = useParams<{ slug: string }>();
  const [customization, setCustomization] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenLinks, setHiddenLinks] = useState<string[]>([]);
  const [showCallDialog, setShowCallDialog] = useState(false);

  useEffect(() => {
    fetchData();
    // Load hidden links from localStorage
    const stored = localStorage.getItem('hiddenLinks');
    if (stored) {
      setHiddenLinks(JSON.parse(stored));
    }
  }, []);

  const fetchData = async () => {
    try {
      const { data: customData, error: customError } = await supabase
        .from("customizations")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (customError) throw customError;
      setCustomization(customData);

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .order('created_at', { ascending: false });

      if (productError) throw productError;
      setProducts(productData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const links = [
    { 
      key: 'chat',
      label: 'Chat', 
      path: `/chat/${slug}`, 
      icon: '💬',
      image: null,
      legacyPath: ''
    },
    { 
      key: 'call-hector',
      label: 'Call', 
      path: '/call-hector', 
      icon: '📞',
      image: null,
      legacyPath: ''
    },
    { 
      key: 'whatsapp',
      label: `WhatsApp/${slug}`, 
      path: customization?.whatsapp_username ? `https://wa.me/${customization.whatsapp_username}` : '#',
      icon: null,
      image: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
      legacyPath: slug ? `/whatsapp/${slug}` : ''
    },
    { 
      key: 'instagram',
      label: `Instagram/${slug}`, 
      path: customization?.instagram_username ? `https://instagram.com/${customization.instagram_username}` : '#', 
      icon: null,
      image: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg',
      legacyPath: slug ? `/instagram/${slug}` : ''
    },
    { 
      key: 'facebook',
      label: `Facebook/${slug}`, 
      path: customization?.facebook_username ? `https://facebook.com/${customization.facebook_username}` : '#', 
      icon: null,
      image: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
      legacyPath: slug ? `/facebook/${slug}` : ''
    },
    { 
      key: 'telegram',
      label: `Telegram/${slug}`, 
      path: customization?.telegram_username ? `https://t.me/${customization.telegram_username}` : '#', 
      icon: null,
      image: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg',
      legacyPath: slug ? `/telegram/${slug}` : ''
    },
  ];

  const productLinks = products.map(product => ({
    key: `/product/${product.link_slug}`,
    label: product.name,
    path: `/product/${product.link_slug}`,
    icon: null,
    image: product.image_url,
    isProduct: true,
    productData: product,
    slug: product.link_slug,
    legacyPath: ''
  }));

  // Filter out hidden links
  const hiddenSet = new Set(hiddenLinks);
  const allLinks = [...links, ...productLinks].filter((link: any) => {
    return !hiddenSet.has(link.key)
      && !hiddenSet.has(link.path)
      && !(link.slug && hiddenSet.has(link.slug))
      && !(link.legacyPath && hiddenSet.has(link.legacyPath));
  });


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${hubBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-gradient-dark/80" />
      
      <div className="w-full max-w-3xl relative z-10">
        {/* Logo/Avatar */}
        <div className="text-center mb-12">
          {customization?.logo_url ? (
            <img
              src={customization.logo_url}
              alt="Business Logo"
              className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-white/20 shadow-elegant"
            />
          ) : (
            <div className="w-32 h-32 rounded-full mx-auto mb-6 bg-white/10 backdrop-blur-sm flex items-center justify-center border-4 border-white/20 shadow-elegant">
              <span className="text-5xl">🤖</span>
            </div>
          )}
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
            {customization?.business_name || "Business Name"}
          </h1>
          <p className="text-white/90 text-xl">
            {customization?.greeting || "Welcome to our AI assistant!"}
          </p>
        </div>

        {/* Spacebar-style Link Buttons */}
        <div className="space-y-4 animate-fade-in">
          {allLinks.map((link, index) => {
            const isExternal = link.path.startsWith('http');
            const isCallHector = link.key === 'call-hector';
            
            const buttonContent = (
              <div className="relative group">
                {/* Spacebar Button */}
                <div className="bg-gradient-to-b from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-600 rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.3),0_8px_16px_-4px_rgba(0,0,0,0.5)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.3),0_4px_12px_-4px_rgba(0,0,0,0.5)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.3),0_2px_8px_-4px_rgba(0,0,0,0.5)] transition-all duration-150 active:translate-y-1 p-4 flex items-center gap-4 min-h-[80px]">
                  {/* Icon/Image on left edge */}
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                    {link.image ? (
                      <img 
                        src={link.image} 
                        alt={link.label}
                        className="w-10 h-10 object-contain rounded"
                      />
                    ) : (
                      <span className="text-3xl">{link.icon}</span>
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className="flex-1">
                    <p className="text-white text-lg font-semibold tracking-wide">
                      {link.label}
                    </p>
                  </div>

                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                </div>
              </div>
            );

            if (isCallHector) {
              return (
                <button
                  key={index}
                  onClick={() => setShowCallDialog(true)}
                  className="block w-full"
                >
                  {buttonContent}
                </button>
              );
            }

            return isExternal ? (
              <a
                key={index}
                href={link.path}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                {buttonContent}
              </a>
            ) : (
              <Link
                key={index}
                to={link.path}
                className="block w-full"
              >
                {buttonContent}
              </Link>
            );
          })}
        </div>
      </div>

      {showCallDialog && <CallHectorUI onClose={() => setShowCallDialog(false)} />}
    </div>
  );
};

export default PublicHub;
