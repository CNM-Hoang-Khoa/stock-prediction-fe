const jsonToArray = (js) => {
  console.log(js);
  // const result = js?.Date.map((i, index) => {
  //   return { time: i, value: js.Predictions[index] };
  // });

  const result = Object.keys(js.Date).map((i) => ({
    time: js.Date[i],
    value: js.Predictions[i],
  }));

  return result;
};

export { jsonToArray };
