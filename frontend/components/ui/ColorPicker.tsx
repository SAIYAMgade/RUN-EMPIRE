import React, { useState } from 'react';
import { TERRITORY_COLORS } from '../../lib/colors';
import { useUserStore } from '../../stores/userStore';

export function ColorPicker() {
  const { currentUser, token, setCurrentUser } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) return null;

  const handleColorChange = async (color: string) => {
    if (color === currentUser.color) return;
    setLoading(true);
    setError(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    try {
      const res = await fetch(`${backendUrl}/api/users/update-color`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ color })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update color');
      }

      // Update state
      setCurrentUser({
        ...currentUser,
        color
      });

      // Dispatch toast event
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message: '🎨 Territory color updated successfully!', type: 'success' }
      }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update color');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-slate-400 select-none">TERRITORY COLOR</span>
      <div className="flex flex-wrap gap-2">
        {TERRITORY_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handleColorChange(color)}
            disabled={loading}
            className={`w-7 h-7 rounded-full border-2 transition-all duration-200 cursor-pointer ${
              currentUser.color === color 
                ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]' 
                : 'border-slate-800 hover:border-slate-400 hover:scale-105'
            }`}
            style={{ 
              backgroundColor: color,
              boxShadow: currentUser.color === color ? `0 0 12px ${color}` : undefined
            }}
            title={color}
          />
        ))}
      </div>
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}
