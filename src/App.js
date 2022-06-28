import React from "react";
import Chart from "./components/Chart/Chart";
import "./App.css";

function App() {
  return (
    <div className="App">
      <React.StrictMode>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h1>Stock Prediction</h1>
          <Chart />
        </div>
      </React.StrictMode>
    </div>
  );
}

export default App;
