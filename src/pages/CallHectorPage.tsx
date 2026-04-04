import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';

const TELNYX_PHONE = "+2342093940544";

const CallHectorPage = () => {
  const handleCall = () => {
    window.location.href = `tel:${TELNYX_PHONE}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center space-y-8 px-4">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white">Talk to BECCA</h1>
          <p className="text-xl text-gray-300">Start a voice call with our AI Brain</p>
        </div>

        <Button
          onClick={handleCall}
          className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 rounded-full text-xl shadow-2xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-105"
        >
          <Phone className="mr-3 h-6 w-6" />
          Call Now
        </Button>

        <p className="text-gray-400 text-sm">{TELNYX_PHONE}</p>
      </div>
    </div>
  );
};

export default CallHectorPage;
