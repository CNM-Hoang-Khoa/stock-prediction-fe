/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import OutlinedInput from "@mui/material/OutlinedInput";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import { jsonToArray } from "./utils";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const PREDICTION_TYPES = {
  XGBoost: "XGBoost",
  LSTM: "LSTM",
  RNN: "RNN",
};

const PREDICTION_VALUES = {
  CLOSE: "Close Value",
  ROC: "Price change Value",
};

const Chart = () => {
  const [predictionType, setPredictionType] = useState(
    PREDICTION_TYPES.XGBoost
  );
  const [predictionValue, setPredictionValue] = useState([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const chartRef = useRef();
  const originalChart = useRef();
  const closeChart = useRef();
  const rocChart = useRef();
  const predictCloseChart = useRef();
  const predictROCChart = useRef();
  const ts = useRef();

  const [closeValueData, setCloseValueData] = useState([
    { time: 0, value: "" },
  ]);
  const [predictCloseValue, setPredictCloseValue] = useState([
    { time: 0, value: "" },
  ]);
  const [predictROCValue, setPredictROCValue] = useState([
    { time: 0, value: "" },
  ]);

  useEffect(() => {
    originalChart.current = createChart(chartRef.current, {
      width: 1500,
      height: 600,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      layout: {
        textColor: "#d1d4dc",
        backgroundColor: "#000000",
      },
      rightPriceScale: {
        visible: true,
        borderColor: "rgba(197, 203, 206, 1)",
        scaleMargins: {
          top: 0.3,
          bottom: 0.25,
        },
      },
      leftPriceScale: {
        visible: true,
        borderColor: "rgba(197, 203, 206, 1)",
      },
      grid: {
        vertLines: {
          color: "rgba(42, 46, 57, 0)",
        },
        horzLines: {
          color: "rgba(42, 46, 57, 0)",
        },
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });
    rocChart.current = originalChart.current.addAreaSeries({
      priceScaleId: "left",
      topColor: "rgba(255, 192, 0, 0.7)",
      bottomColor: "rgba(255, 192, 0, 0.3)",
      lineColor: "rgba(255, 192, 0, 1)",
      lineWidth: 2,
      title: "ROC Value",
      visible: false,
    });
    closeChart.current = originalChart.current.addAreaSeries({
      title: "Close Value",
      topColor: "rgba(67, 83, 254, 0.7)",
      bottomColor: "rgba(67, 83, 254, 0.3)",
      lineColor: "rgba(67, 83, 254, 1)",
      lineWidth: 2,
      visible: false,
    });

    predictCloseChart.current = originalChart.current.addLineSeries({
      title: "Prediction Close Value",
      color: "green",
      visible: false,
    });

    predictROCChart.current = originalChart.current.addLineSeries({
      title: "Prediction ROC Value",
      priceScaleId: "left",
      color: "red",
      visible: false,
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
            .then((response) => {
              setIsFirstLoad(false);
              setPredictCloseValue(jsonToArray(JSON.parse(response["Close"])));
              setPredictROCValue(jsonToArray(JSON.parse(response["ROC"])));
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
        .then((response) => {
          setIsFirstLoad(false);
          setPredictCloseValue(jsonToArray(JSON.parse(response["Close"])));
          setPredictROCValue(jsonToArray(JSON.parse(response["ROC"])));
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
    predictROCChart.current.setData(predictROCValue);
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
          .then((response) => {
            predictCloseChart.current.update(
              jsonToArray(JSON.parse(response["Close"]))[0]
            );
            predictROCChart.current.update(
              jsonToArray(JSON.parse(response["ROC"]))[0]
            );
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

  const handleChangePredictionValue = (e) => {
    setPredictionValue(e.target.value);
    if (e.target.value.indexOf("CLOSE") > -1) {
      closeChart.current.applyOptions({ visible: true });
      predictCloseChart.current.applyOptions({ visible: true });
    } else {
      closeChart.current.applyOptions({ visible: false });
      predictCloseChart.current.applyOptions({ visible: false });
    }
    if (e.target.value.indexOf("ROC") > -1) {
      rocChart.current.applyOptions({ visible: true });
      predictROCChart.current.applyOptions({ visible: true });
    } else {
      rocChart.current.applyOptions({ visible: false });
      predictROCChart.current.applyOptions({ visible: false });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex" }}>
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
        <FormControl style={{ minWidth: "500px", margin: "20px 50px" }}>
          <InputLabel id="demo-multiple-checkbox-label">
            Choose value to predict
          </InputLabel>
          <Select
            labelId="demo-multiple-checkbox-label"
            id="demo-multiple-checkbox"
            multiple
            value={predictionValue}
            onChange={handleChangePredictionValue}
            input={<OutlinedInput label="Choose value to predict" />}
            renderValue={(selected) => selected.join(", ")}
            MenuProps={MenuProps}
          >
            {Object.keys(PREDICTION_VALUES).map((item) => (
              <MenuItem key={item} value={item}>
                <Checkbox checked={predictionValue.indexOf(item) > -1} />
                <ListItemText primary={PREDICTION_VALUES[item]} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      <div ref={chartRef} />
    </div>
  );
};

export default Chart;
