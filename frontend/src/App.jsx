import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
// import DynamicInputList from './DynamicInputList.jsx'
// import RandomBubbleInputs from './RandomBubbleInputs.jsx'
import InputToBubble from './InputToBubble.jsx'
import Map from './Map.jsx'

function App() {
  // const [count, setCount] = useState(0)
  // return <Map positionInfos={[{address: "Liberty Statue"}, {address: "Empire State Building"}]}/>

  // return (
  //   <>
  //     {/* <div>
  //       <a href="https://vite.dev" target="_blank">
  //         <img src={viteLogo} className="logo" alt="Vite logo" />
  //       </a>
  //       <a href="https://react.dev" target="_blank">
  //         <img src={reactLogo} className="logo react" alt="React logo" />
  //       </a>
  //     </div>
  //     <h1>Vite + React</h1>
  //     <div className="card">
  //       <button onClick={() => setCount((count) => count + 1)}>
  //         count is {count}
  //       </button>
  //       <p>
  //         Edit <code>src/App.jsx</code> and save to test HMR
  //       </p>
  //     </div>
  //     <p className="read-the-docs">
  //       Click on the Vite and React logos to learn more
  //     </p> */}
  //     {/* <input name="myInput" /> */}
  //     {/* <DynamicInputList /> */}
  //     {/* <RandomBubbleInputs /> */}
      return <InputToBubble />
  //   </>
  // )
}

export default App
