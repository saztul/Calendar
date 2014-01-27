window.Time = {
  _YEAR: 60 * 60 * 24 * 365 * 1000,
  _WEEK: 60 * 60 * 24 * 7 * 1000,
  _DAY: 60 * 60 * 24 * 1000,
  _MONTH_MAP: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],

  to_date: function(date){
    // the string version works better with time zone shifts CET/CEST
    var pad = date.getDate() < 10 ? '0' : '';
    return Date.parse(''+date.getFullYear() + '-' + this._MONTH_MAP[date.getMonth()] + '-' + pad  + date.getDate());
  },

  beginning_of_day: function(date){
    return new Date(this.to_date(date));
  },
  end_of_day: function(){
    return new Date(this.to_date(date) + this._DAY - 1);
  },

  next_day_of_id: function(date, id){
    var day = date.getDay();
    if(day != id){
      var add = id - day;
      if(add < 0) add += 7;
      date = new Date(this.to_date(date) + add * this._DAY);
    }
    return this.beginning_of_day(date);
  },

  beginning_of_week: function(date, first_day){
    day_id = first_day == 'mo' ? 1 : 0;
    return new Date(this.to_date(this.next_day_of_id(date, day_id)) - this._WEEK)
  },
  
  end_of_week: function(date, first_day){
    day_id = first_day == 'mo' ? 0 : 6;
    return this.next_day_of_id(date, day_id);
  },
  
  span: function(from, til){
    return Date.parse(til) - Date.parse(from);
  },
  
  is_last_day: function(date){
    if(date.getDate() < 28) return false;
    var test_date = new Date(date);
    test_date.setDate(test_date.getDate() + 1);
    return test_date.getDate() == 1;
  },
  
  is_in_last_week: function(date){
    if(date.getDate() < 21) return false;
    var test_date = new Date(date);
    test_date.setDate(test_date.getDate() + 7);
    return test_date.getMonth() != date.getMonth();
  },
}