import { useCallback } from 'react';
import './TimeScrubber.css';

interface TimeScrubberProps {
  currentTurn: number;
  maxTurn: number;
  onTurnChange: (turn: number) => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
}

export function TimeScrubber({
  currentTurn,
  maxTurn,
  onTurnChange,
  isPlaying = false,
  onPlayPause
}: TimeScrubberProps) {
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTurnChange(parseInt(e.target.value, 10));
  }, [onTurnChange]);

  const handlePrev = useCallback(() => {
    if (currentTurn > 0) {
      onTurnChange(currentTurn - 1);
    }
  }, [currentTurn, onTurnChange]);

  const handleNext = useCallback(() => {
    if (currentTurn < maxTurn) {
      onTurnChange(currentTurn + 1);
    }
  }, [currentTurn, maxTurn, onTurnChange]);

  const handleFirst = useCallback(() => {
    onTurnChange(0);
  }, [onTurnChange]);

  const handleLast = useCallback(() => {
    onTurnChange(maxTurn);
  }, [maxTurn, onTurnChange]);

  return (
    <div className="time-scrubber">
      <div className="scrubber-controls">
        <button
          className="scrubber-btn"
          onClick={handleFirst}
          disabled={currentTurn === 0}
          title="First turn"
        >
          ⏮
        </button>
        <button
          className="scrubber-btn"
          onClick={handlePrev}
          disabled={currentTurn === 0}
          title="Previous turn"
        >
          ◀
        </button>
        {onPlayPause && (
          <button
            className="scrubber-btn play-btn"
            onClick={onPlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        )}
        <button
          className="scrubber-btn"
          onClick={handleNext}
          disabled={currentTurn === maxTurn}
          title="Next turn"
        >
          ▶
        </button>
        <button
          className="scrubber-btn"
          onClick={handleLast}
          disabled={currentTurn === maxTurn}
          title="Last turn"
        >
          ⏭
        </button>
      </div>

      <div className="scrubber-slider-container">
        <input
          type="range"
          className="scrubber-slider"
          min={0}
          max={maxTurn}
          value={currentTurn}
          onChange={handleSliderChange}
        />
        <div className="scrubber-ticks">
          {Array.from({ length: Math.min(maxTurn + 1, 21) }, (_, i) => {
            const tick = maxTurn <= 20 ? i : Math.round((i / 20) * maxTurn);
            return (
              <span key={tick} className="tick-mark">
                {tick}
              </span>
            );
          })}
        </div>
      </div>

      <div className="scrubber-info">
        <span className="turn-display">
          Turn <strong>{currentTurn}</strong> of <strong>{maxTurn}</strong>
        </span>
      </div>
    </div>
  );
}
