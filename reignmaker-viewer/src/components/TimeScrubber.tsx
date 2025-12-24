import { useState, useEffect } from 'react';
import './TimeScrubber.css';

interface TimeScrubberProps {
  totalTurns: number;
  currentTurn: number;
  onTurnChange: (turn: number) => void;
  isPlaying?: boolean;
  onPlayPauseToggle?: () => void;
}

export function TimeScrubber({
  totalTurns,
  currentTurn,
  onTurnChange,
  isPlaying = false,
  onPlayPauseToggle
}: TimeScrubberProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const turn = parseInt(e.target.value, 10);
    onTurnChange(turn);
  };

  const handlePrevTurn = () => {
    if (currentTurn > 1) {
      onTurnChange(currentTurn - 1);
    }
  };

  const handleNextTurn = () => {
    if (currentTurn < totalTurns) {
      onTurnChange(currentTurn + 1);
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  return (
    <div className="time-scrubber">
      <div className="scrubber-top">
        <div className="scrubber-slider-container">
          <input
            type="range"
            min="1"
            max={totalTurns}
            value={currentTurn}
            onChange={handleSliderChange}
            onMouseDown={handleMouseDown}
            className="scrubber-slider"
          />
        </div>
        <div className="scrubber-right">
          <div className="turn-display">
            Turn <strong>{currentTurn}</strong> / {totalTurns}
          </div>
          <div className="scrubber-controls">
            <button
              className="scrubber-button"
              onClick={handlePrevTurn}
              disabled={currentTurn <= 1}
              title="Previous Turn"
            >
              ◀
            </button>

            {onPlayPauseToggle && (
              <button
                className="scrubber-button play-pause"
                onClick={onPlayPauseToggle}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
            )}

            <button
              className="scrubber-button"
              onClick={handleNextTurn}
              disabled={currentTurn >= totalTurns}
              title="Next Turn"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
