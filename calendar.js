window.Calendar = {
  _ID: 0,
  _ROWS_PER_BLOCK: 20,
  
  cleanup_block: function(_Env, rows, before_row, after_row){
    var remove = [];
    var _clear = function(block){
      if(_Env.update_draw_status(block, false)){
        remove.push('#'+_Env.nr_to_block_id(block));
      }
    };
    for(var block = before_row - 1; block >= 0; block--){
      _clear(block);
    }
    for(var block = after_row + 1; block <= rows; block++){
      _clear(block);
    }
    $(remove.join(',')).remove();
  },
  
  draw_block: function(_Env, nr, cell_height, cell_generator){
    if(_Env.update_draw_status(nr, true)) return;
    
    // calculate rows in block
    var from = nr * Calendar._ROWS_PER_BLOCK;
    var til  = from + Calendar._ROWS_PER_BLOCK;
    
    // build block
    var block_html = '';
    for(var row = from; row < til; row++){
      block_html += Calendar.draw_row(_Env, row, cell_generator);
    }
    
    // add referece
    block_html = '<div id="'+_Env.nr_to_block_id(nr)+'">'+block_html+'</div>';
    _Env.draw_context().append($(block_html));
  },
  
  draw_row: function(_Env, row, cell_generator){
    var row_html = '';
    for(var col = 0; col <= 6; col++){
      row_html += cell_generator(row, col, _Env.map_coordinate_to_screen({ row: row, col: col }));
    }
    return row_html;
  },
  
  // 
  // init Calendar frame
  // 
  
  allocate_space: function(target, rows, height){
    var panel_height = (rows * height) + 'px';
    var id = "calendar-" + target.attr('id');
    target.append($('<div id="'+id+'" class="calendar-space-allocator" style="height:'+panel_height+'"></div>'));
    return id;
  },
  
  create_today_anchor: function(_Env){
    var coord = _Env.date_to_coordinate(new Date());
    coord.row -= 1;
    _Env.draw_context().append($('<a name="today" class="today-anchor" style="'+_Env.map_coordinate_to_screen(coord)+'"></a>'));
  },
  
  draw_month_headers: function(target, cal_id, from, til, cell_height){
    var time = Time.to_date(from);
    var end_time =  Time.to_date(til);
    var date, rows = 0, current_row = 0, start_row = 0, start_date = from; 
    var header_html = '';
    while(time <= end_time){
      date = new Date(time);
      if(date.getMonth() != start_date.getMonth()){
        header_html += Calendar.draw_month_header(target, cell_height, start_row, rows, start_date);
        start_row = current_row;
        start_date = date;
        rows = 0;
      }
      current_row++;
      rows++;
      time += Time._WEEK;
    }
    date = new Date(time);
    if(date.getMonth() != start_date.getMonth()){
      header_html += Calendar.draw_month_header(target, cell_height, start_row, rows, start_date);
    }
    target.append($('<div id="'+cal_id+'-months">'+header_html+'</div>'));
  },

  draw_month_header: function(target, cell_height, start_row, rows, date){
    var attrs = 'height:'+(rows*cell_height)+'px;'+
                'position:absolute;'+
                'left:0px;'+
                'top:'+(start_row*cell_height)+'px;'
    return '<div class="month-header month-'+(date.getMonth()+1)+' size-'+rows+'" style="'+attrs+'"><a name="'+date.getFullYear()+'-'+(date.getMonth()+1)+'"></a>'+date.getFullYear()+'</div>';
  },
  
  // 
  // drawing
  // 
  
  draw_window: function(_Env, rows, cell_generator){
    var window_offset = _Env.context().scrollTop();
    var window_height = _Env.context().height();
    var cell_height = _Env.cell_height();
    _Env.cleanup_blocks_after(function(){
      // calculate blocks to paint
      var first_row = Math.floor(window_offset / cell_height);
      var last_row  = Math.ceil((window_offset + window_height) / cell_height);
      var first_block = Math.max(0, Math.floor(first_row/Calendar._ROWS_PER_BLOCK) - 1)
      var last_block = Math.ceil(last_row/Calendar._ROWS_PER_BLOCK) + 1
      for(var block = first_block; block <= last_block; block++){
        Calendar.draw_block(_Env, block, cell_height, cell_generator);
      }
      return { first: first_block, last: last_block };
    });
  },
  
  create: function(id){
    // read config from node
    var self = this;
    var target = $(id);
    var week_start = target.data('week-start') || 'mo'; // 1 year
    var time_padding = target.data('time-padding') || 60 * 60 * 24 * 365 * 1000; // 1 year
    var requested_from = new Date(Date.parse(target.data('from')) || Date.now() - time_padding);
    var requested_til  = new Date(Date.parse(target.data('til'))  || Date.now() + time_padding);
    // todo read from node
    var cell_height = 80;
    
    // calculate time span 
    var from = Time.beginning_of_week(requested_from, week_start);
    var til  = Time.end_of_week(requested_til, week_start);
    var day_count = Time.span(from, til) / Time._DAY;
    var rows = (day_count + 1) / 7;

    var base_time = Time.to_date(from);
    var today = Time.to_date(new Date());
    
    var space_id = Calendar.allocate_space(target, rows, cell_height);
    var draw_target = $('#'+space_id);
    
    
    var _Env = {};
    
    // map date to field
    _Env.date_to_coordinate = function(date){
      var rel_date = Time.to_date(date) - base_time;
      return { 
        row: Math.floor(rel_date/Time._WEEK), 
        col: date.getDay()-1 
      };  
    };
    
    // map field to date
    _Env.coordinate_to_date = function(coordinate){
      return new Date(from.getFullYear(), from.getMonth(), from.getDate() + (coordinate.row * 7) + coordinate.col)
    };
    
    // generate dom id for block
    _Env.nr_to_block_id = function(nr){
      return space_id + '-block-' + nr;
    };
    
    _Env.map_coordinate_to_screen = function(coordinate){
      return 'position:absolute;'+
        'width: 14.2857142857%;' +
        'height:' + (cell_height) + 'px;' +
        'top:' + (coordinate.row * cell_height) + 'px;' + 
        'left:' + (coordinate.col * 14.2857142857) + '%;';
    };
    
    _Env.context = function(){
      return target;
    };
    
    _Env.draw_context = function(){
      return draw_target;
    };
    
    _Env.cell_height = function(){
      return cell_height;
    };
    
    var _draw_status = [];
    _Env.update_draw_status = function(id, new_status){
      var old_status = _draw_status[id] || false;
      _draw_status[id] = new_status;
      return old_status;
    };
    
    var _block_cleanup_timer = null;
    _Env.cleanup_blocks_after = function(callback){
      clearTimeout(_block_cleanup_timer);
      var blocks = callback();
      _block_cleanup_timer = setTimeout(function(){
        Calendar.cleanup_block(_Env, rows, blocks.first - 1, blocks.last + 1);
      }, 500);
    };
    
    var _refresh_timer = null;
    _Env.schedule_redraw = function(callback){
      clearTimeout(_refresh_timer);
      _refresh_timer = setTimeout(callback, 16);
    };

    var cell_generator = function(row, col, attrs){
      var date = _Env.coordinate_to_date({ row: row, col: col });
      var classes = 'cell';
      if(Time.is_in_last_week(date)){ classes += ' in-last-week'; }
      if(Time.is_last_day(date)){ classes += ' last-day'; }
      if(Time.to_date(date) == today){ classes += ' today'; }
      classes += ' month-'+(date.getMonth()+1);
      classes += ' row-'+row;
      classes += ' cell-'+col;
      return '<div style="'+attrs+'"><div class="'+classes+'"><span>'+date.getDate()+'</span></div></div>';
    };
    
    Calendar.create_today_anchor(_Env);
    Calendar.draw_month_headers(target, space_id, from, til, cell_height);
    Calendar.draw_window(_Env, rows, cell_generator);
    
    var _refresh_timer = null;
    target.scroll(function(e){
      clearTimeout(_refresh_timer);
      _refresh_timer = setTimeout(function(){
        Calendar.draw_window(_Env, rows, cell_generator);
      }, 16);
    });

    var Api = {};
    Api.add_event = function(title, link, from, til, color){
      var rel_from = Time.to_date(from) - base_time;
      var row = Math.floor(rel_from/Time._WEEK);
      var event = $('<a class="cal-entry" href="#"></a>');
      var style = 'width: 13%;' +
                  'position:absolute;'+
                  'top:' + ((row * cell_height)+1) + 'px;' + 
                  'left:' + (((from.getDay()-1) * 14.2857142857) + 0.1428571429) + '%;' + 
                  'background:'+color;
      event.attr('href', link).attr('style', style).attr('title', title).text(title);
      // draw_target.append(event);
    };

    return Api;
  }
};