import { useUserStore } from '../stores/userStore';
import { useTileStore } from '../stores/tileStore';
import { socket } from '../lib/socket';

export function useTileClaim() {
  const { currentUser } = useUserStore();
  const { tiles, setPending, revertOptimistic, applyUpdate } = useTileStore();

  const claimTile = (tileKey: string) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('toast', {
          detail: { message: '🔒 Please sign in to claim territory!', type: 'error' }
        }));
      }
      return;
    }

    const previous = tiles.get(tileKey);

    // If already owned by current user, do nothing
    if (previous && previous.ownerId === currentUser.id) {
      return;
    }

    // 1. Optimistic Update
    setPending(tileKey);

    const isSteal = !!previous?.ownerId && previous.ownerId !== currentUser.id;
    const optimisticPayload = {
      tileKey,
      ownerId:      currentUser.id,
      ownerColor:   currentUser.color,
      ownerName:    currentUser.name,
      claimedAt:    new Date().toISOString(),
      isSteal,
      oldOwnerId:   previous?.ownerId || null,
      oldOwnerName: previous?.ownerName || null,
    };

    // Commit optimistic color change to store
    applyUpdate(optimisticPayload);

    // Trigger local ripple effect immediately for the claimant
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tile-animate', {
        detail: {
          tileKey,
          color:   currentUser.color,
          type:    isSteal ? 'steal' : 'claim'
        }
      }));
    }

    // 2. Network request over Websocket
    socket.emit('tile:claim', tileKey, (res) => {
      if (res.error) {
        // Rollback
        revertOptimistic(tileKey, previous);
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('toast', {
            detail: { message: res.error, type: 'error' }
          }));
        }
      } else {
        // Success
        if (res.result) {
          applyUpdate(res.result);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('toast', {
            detail: {
              message: isSteal 
                ? `💥 You stole territory at tile ${tileKey}!`
                : `✅ Tile ${tileKey} claimed!`,
              type: 'success'
            }
          }));
        }
      }
    });
  };

  return { claimTile };
}
