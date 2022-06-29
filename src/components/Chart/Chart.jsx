/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { jsonToArray } from "./utils";
const PREDICTION_TYPES = {
  XGBoost: "XGBoost",
  LSTM: "LSTM",
  RNN: "RNN",
};

const Chart = () => {
  const [predictionType, setPredictionType] = useState(
    PREDICTION_TYPES.XGBoost
  );
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const chartRef = useRef();
  const originalChart = useRef();
  const closeChart = useRef();
  const predictCloseChart = useRef();
  const rocChart = useRef();
  const ts = useRef();
  const [closeValueData, setCloseValueData] = useState([
    { time: 0, value: "" },
  ]);
  const [predictCloseValue, setPredictCloseValue] = useState([
    { time: 0, value: "" },
  ]);
  useEffect(() => {
    originalChart.current = createChart(chartRef.current, {
      width: 1200,
      height: 600,
      rightPriceScale: {
        visible: true,
        borderColor: "rgba(197, 203, 206, 1)",
      },
      leftPriceScale: {
        visible: true,
        borderColor: "rgba(197, 203, 206, 1)",
      },
      layout: {
        backgroundColor: "#ffffff",
        textColor: "rgba(33, 56, 77, 1)",
      },
      grid: {
        horzLines: {
          color: "#F0F3FA",
        },
        vertLines: {
          color: "#F0F3FA",
        },
      },

      timeScale: {
        borderColor: "rgba(197, 203, 206, 1)",
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });
    rocChart.current = originalChart.current.addLineSeries({
      priceScaleId: "left",
      color: "yellow",
      title: "ROC Value",
    });
    closeChart.current = originalChart.current.addLineSeries({
      title: "Close Value",
    });

    predictCloseChart.current = originalChart.current.addLineSeries({
      title: "Prediction Close Value",
      color: "green",
    });

    isFirstLoad &&
      fetch(`http://127.0.0.1:5000/history`)
        .then((r) => r.json())
        .then((response) => {
          setCloseValueData(response);
        })
        .then(() => {
          fetch(`http://127.0.0.1:5000/predict?type=${predictionType}`)
            .then((r) => r.json())
            .then((r) => JSON.parse(r))
            .then((response) => {
              setIsFirstLoad(false);
              setPredictCloseValue(jsonToArray(response));
            });
        });

    return () => {
      originalChart.current.remove();
    };
  }, []);

  useEffect(() => {
    !isFirstLoad &&
      fetch(`http://127.0.0.1:5000/predict?type=${predictionType}`)
        .then((r) => r.json())
        .then((r) => JSON.parse(r))
        .then((response) => {
          setIsFirstLoad(false);
          setPredictCloseValue(jsonToArray(response));
        });
  }, [predictionType]);

  useEffect(() => {
    closeChart.current.setData(closeValueData);
    const rocData = closeValueData.map((r, index) => ({
      ...r,
      value:
        index > 0
          ? ((r.value - closeValueData[index - 1].value) /
              closeValueData[index - 1].value) *
            100
          : 0,
    }));
    rocChart.current.setData(rocData);
    ts.current = closeValueData[closeValueData.length - 1].time;
  }, [closeValueData]);

  useEffect(() => {
    predictCloseChart.current.setData(predictCloseValue);
  }, [predictCloseValue]);

  useEffect(() => {
    const binanceSocket = new WebSocket(
      "wss://stream.binance.com:9443/ws/btcusdt@kline_3m"
    );

    binanceSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const candlestick = message.k;
      const time = message.k.t / 1000;

      if (time !== ts.current && !isFirstLoad) {
        ts.current = time;
        console.log("update data");
        rocChart.current.update({
          time,
          value:
            ((candlestick.c - closeValueData[closeValueData.length - 1].value) /
              closeValueData[closeValueData.length - 1].value) *
            100,
        });
        closeChart.current.update({
          time,
          value: candlestick.c,
        });
        fetch(
          `http://127.0.0.1:5000/update-predict?type=${predictionType}&time=${time}&value=${candlestick.c}`
        )
          .then((r) => r.json())
          .then((r) => JSON.parse(r))
          .then((response) => {
            const result = jsonToArray(response);
            predictCloseChart.current.update(result[0]);
          });
      }

      // closeChart.current.update({
      //   time: candlestick.t / 1000,
      //   open: candlestick.o,
      //   high: candlestick.h,
      //   low: candlestick.l,
      //   close: candlestick.c,
      //   value: candlestick.c,
      // });
    };
  });

  const handleChangePredictionType = (e) => {
    setPredictionType(e.target.value);
    predictCloseChart.current.setData([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <FormControl style={{ minWidth: "200px", margin: "20px 50px" }}>
        <InputLabel id="demo-simple-select-label">
          Choose Prediction Type
        </InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={predictionType}
          label="Choose Prediction Type"
          onChange={handleChangePredictionType}
        >
          {Object.keys(PREDICTION_TYPES).map((item) => (
            <MenuItem
              key={PREDICTION_TYPES[item]}
              value={PREDICTION_TYPES[item]}
            >
              {PREDICTION_TYPES[item]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <div ref={chartRef} />
    </div>
  );
};

export default Chart;
