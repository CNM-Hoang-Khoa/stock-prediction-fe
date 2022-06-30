const jsonToArray = (js) => {
  const result = Object.keys(js.Date).map((i) => ({
    time: js.Date[i],
    value: js.Predictions[i],
  }));
  return result;
};

export { jsonToArray };
