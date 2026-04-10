import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useIsMobile } from "@/hooks/use-mobile";
import hubBackground from "@/assets/hub-background.jpg";

const PublicHub = () => {
  const { slug } = useParams<{ slug: string }>();
  const [hiddenLinks, setHiddenLinks] = useState<string[]>([]);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [bgUrl, setBgUrl] = useState(hubBackground);

  // Use Convex reactive queries directly — no manual fetchData needed
  const customization = useQuery(api.customizations.get, {});
  const convexProducts = useQuery(api.products.list, {});
  const products = (convexProducts as any[]) || [];
  const convexProperties = useQuery(api.properties.list, {});
  const availableProperties = ((convexProperties as any[]) || []).filter((p: any) => p.status === "available" || p.status === "pending");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const loading = customization === undefined;

  useEffect(() => {
    // Load hidden links from localStorage and listen for changes
    const loadHiddenLinks = () => {
      const stored = localStorage.getItem('hiddenLinks');
      if (stored) {
        setHiddenLinks(JSON.parse(stored));
      }
    };

    loadHiddenLinks();

    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', loadHiddenLinks);

    return () => window.removeEventListener('storage', loadHiddenLinks);
  }, []);

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
      path: customization?.facebook_username ? `https://www.facebook.com/profile.php?id=${customization.facebook_username}` : '#', 
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


  // Determine which background to use based on screen width
  const getResponsiveBg = () => {
    const w = window.innerWidth;
    if (w <= 768 && (customization as any)?.hub_bg_phone_url) return (customization as any).hub_bg_phone_url;
    if (w <= 1024 && (customization as any)?.hub_bg_tablet_url) return (customization as any).hub_bg_tablet_url;
    if ((customization as any)?.hub_bg_desktop_url) return (customization as any).hub_bg_desktop_url;
    return hubBackground;
  };

  useEffect(() => {
    if (customization) {
      setBgUrl(getResponsiveBg());
      const handleResize = () => setBgUrl(getResponsiveBg());
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [customization]);

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
        backgroundImage: `url(${bgUrl})`,
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
            {customization?.greeting || "Welcome to our AI Brain!"}
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
                      <span className="text-3xl leading-none flex items-center justify-center">{link.icon}</span>
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className="flex-1 flex items-center">
                    <p className="text-white text-lg font-semibold tracking-wide leading-none">
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
              <button
                key={index}
                className="block w-full text-left"
                onClick={() => {
                  window.open(link.path, '_blank') || (window.location.href = link.path);
                }}
              >
                {buttonContent}
              </button>
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

        {/* Featured Properties */}
        {availableProperties.length > 0 && (
          <div className="mt-12 w-full max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Featured Properties</h2>
            <p className="text-white/60 text-sm text-center mb-6">Browse our available listings</p>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {["all", "sale", "rent", "lease"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPropertyFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    propertyFilter === filter
                      ? "bg-white/20 text-white border border-white/40 shadow-lg"
                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {filter === "all" ? "All" : `For ${filter.charAt(0).toUpperCase() + filter.slice(1)}`}
                </button>
              ))}
            </div>

            {/* Property cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableProperties
                .filter((p: any) => propertyFilter === "all" || p.listing_type === propertyFilter)
                .slice(0, 6)
                .map((property: any) => (
                  <div
                    key={property._id}
                    className="bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
                  >
                    {/* Property image */}
                    {property.images?.[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <span className="text-4xl">🏠</span>
                      </div>
                    )}

                    {/* Property info */}
                    <div className="p-4">
                      <h3 className="text-white font-semibold text-base truncate">{property.title}</h3>
                      <p className="text-white/50 text-xs mt-1">
                        {property.city}{property.state ? `, ${property.state}` : ""}
                      </p>

                      {/* Specs */}
                      <div className="flex items-center gap-3 mt-2 text-white/60 text-xs">
                        {property.bedrooms != null && <span>{property.bedrooms} bed</span>}
                        {property.bathrooms != null && <span>{property.bathrooms} bath</span>}
                        {property.sqft && <span>{property.sqft.toLocaleString()} sqft</span>}
                      </div>

                      {/* Price and type */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-cyan-400 font-bold">
                          ₦{(property.price || 0).toLocaleString()}
                          {property.price_period && property.price_period !== "one-time"
                            ? `/${property.price_period === "monthly" ? "mo" : "yr"}`
                            : ""}
                        </span>
                        <span className="text-[10px] uppercase bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                          {property.listing_type || "sale"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Show more indicator */}
            {availableProperties.filter((p: any) => propertyFilter === "all" || p.listing_type === propertyFilter).length > 6 && (
              <p className="text-center text-white/40 text-sm mt-4">
                Call or chat to see more listings
              </p>
            )}
          </div>
        )}
      </div>

      {/* Call dialog replaced — calls go through Telnyx phone directly */}
    </div>
  );
};

export default PublicHub;
