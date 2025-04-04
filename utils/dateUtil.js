function formatDate(date) {
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
  }
  
  function formatTime(date) {
    return `${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
  }
  
  function padZero(num) {
    return num < 10 ? `0${num}` : num;
  }
  
  function getDateStr(date) {
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
  }
  
  function startOfDay(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  
  function endOfDay(date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  
  function startOfMonth(date) {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  
  function endOfMonth(date) {
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  
  module.exports = {
    formatDate,
    formatTime,
    getDateStr,
    startOfDay,
    endOfDay,
    startOfMonth,
    endOfMonth
  };