import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  className?: string;
  text?: string;
}

export default function BackButton({ to, onClick, className = '', text = 'Retour' }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4 ${className}`}
    >
      <ArrowLeft size={16} />
      <span className="text-sm font-medium">{text}</span>
    </button>
  );
}