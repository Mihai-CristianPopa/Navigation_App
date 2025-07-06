import React, { useState } from "react";
// import { geocodeAttraction } from "./helpers/geocoding.js";
const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN;
const GEOCODE_ENDPOINT = import.meta.env.VITE_GEOCODE_ENDPOINT;

function InputToBubble() {
  const [bubbles, setBubbles] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState(null);

  const geocodeAttraction = async () => {
    const firstAttractionName = bubbles[0].text;
    // const origin = "http://localhost:3000"
    // const endpoint = "/api/geocode"
    const apiUri = `${BACKEND_ORIGIN}${GEOCODE_ENDPOINT}?place=${encodeURIComponent(firstAttractionName)}`;
    const response = await fetch(apiUri);
    const results = await response.json();
    console.log(results)
  }

  const addBubble = () => {
    if (!inputValue.trim()) return;

    // geocodeAttraction(inputValue, result => console.log(result));

    const bubbleSize = Math.floor(Math.random() * 60) + 40;

    const newBubble = {
      id: crypto.randomUUID(),
      text: inputValue,
      size: bubbleSize,
      left: Math.floor(Math.random() * (window.innerWidth - bubbleSize)),
      top: Math.floor(Math.random() * (window.innerHeight - bubbleSize)),
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
    };

    setBubbles(prev => [...prev, newBubble]);
    setInputValue('');
  };

  const removeBubble = (id) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  };

  const updateText = (id, value) => {
    setBubbles(prev =>
      prev.map(b => (b.id === id ? { ...b, text: value } : b))
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setEditingId(null);
    }
  };

  return (
    <>
      {/* Input Bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          padding: '16px',
          backgroundColor: 'white',
          zIndex: 1000,
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        }}
      >
        <input
          type="text"
          value={inputValue}
          placeholder="Enter text..."
          onChange={(e) => setInputValue(e.target.value)}
          style={{ padding: '8px', marginRight: '8px' }}
        />
        <button onClick={addBubble}>Add Bubble</button>
        <button onClick={geocodeAttraction}>Get coordinates</button>
      </div>

      {/* Full-Screen Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
        }}
      >
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            style={{
              position: 'absolute',
              width: bubble.size,
              height: bubble.size,
              left: bubble.left,
              top: bubble.top,
              backgroundColor: bubble.color,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              boxShadow: '0 0 6px rgba(0,0,0,0.3)',
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
              overflow: 'hidden',
              padding: '4px',
              cursor: 'pointer',
            }}
          >
            {editingId === bubble.id ? (
              <input
                type="text"
                value={bubble.text}
                autoFocus
                onBlur={() => setEditingId(null)}
                onKeyDown={handleKeyDown}
                onChange={(e) => updateText(bubble.id, e.target.value)}
                style={{
                  width: '90%',
                  border: 'none',
                  background: 'transparent',
                  color: 'white',
                  textAlign: 'center',
                  outline: 'none',
                  fontWeight: 'bold',
                }}
              />
            ) : (
              <div onDoubleClick={() => setEditingId(bubble.id)}>
                {bubble.text}
              </div>
            )}

            <button
              onClick={() => removeBubble(bubble.id)}
              style={{
                marginTop: 4,
                fontSize: 10,
                background: 'rgba(0,0,0,0.3)',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default InputToBubble;
