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
    var id = "cal-" + target.attr('id');
    target.append($('<div id="'+id+'-info" class="hover-info"></div>'));
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
  fill_cell: function(_Store, key, cell){
    var slots = [];
    var events = _Store.daymap[key];
    var cont = $('<div class="inner"></div>'), timed = $('<div class="timed"></div>'), event;
    var id;
    var slot_height = 8;
    
    // console.log(' ');
    // console.log('fill cell');
    // put events in their prevoiusly assigned slots
    for(var i = 0; i < events.length; i++){
      id = events[i];
      if(_Store.events[id][_Store.keys.slot]){
        slots[_Store.events[id][_Store.keys.slot]] = id;
      }
    }
    // console.log(slots);
    
    // assing new slots to new events
    var max = 2 * events.length;
    var pos = 1;
    for(var i = 0; i < events.length; i++){
      id = events[i];
      while(_Store.events[id][_Store.keys.slot] == 0 && _Store.events[id][_Store.keys.days] > 1){
        if(!slots[pos]){
          _Store.events[id][_Store.keys.slot] = pos
          slots[pos] = id;
        }
        pos++;
      }
    }
    // console.log(slots);
    
    var timed_pos = 0;
    for(var i = 1; i < slots.length; i++){
      if(typeof slots[i] != 'undefined'){
        timed_pos = Math.max(timed_pos,i);
      }
    }
    // console.log(timed_pos);

    for(var i = 0; i < events.length; i++){
      id = events[i];
      event = $('<a href="#"></a>');
      event.attr('title', _Store.events[id][_Store.keys.title]).attr('href', _Store.events[id][_Store.keys.link]);
      if(_Store.events[id][_Store.keys.days] > 1){
        event.addClass('all-day');
        event.attr('style', 'top:'+((_Store.events[id][_Store.keys.slot]-1)*slot_height)+'px;border-color:'+_Store.events[id][_Store.keys.color]);
        var event_start = _Store.events[id][_Store.keys.from];
        var ekey = ''+event_start.getDate()+'-'+event_start.getMonth()+'-'+event_start.getFullYear();
        if(key != ekey){
          event.addClass('cont');
        }
        cont.append(event);
      }
      else{
        event.attr('style', 'border-color:'+_Store.events[id][_Store.keys.color]);
        timed.append(event);
      }
    }
    timed.attr('style', 'top:'+((timed_pos)*slot_height)+'px');
    timed.attr('data-slot', timed_pos);
    cont.append(timed);
    cell.replaceWith(cont);
  },
  
  fill_visible: function(_Env, _Store){
    var key, cell, self = this;
    $.map(_Env.context().find('.inner'), function(e, i){
      cell = $(e);
      key = cell.data('key');
      if(_Store.daymap[key]){
        self.fill_cell(_Store, key, cell);
      }
    });
  },

  
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
      _Env.fill_events();
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
    var info_id = space_id+'-info'; 
    var draw_target = $('#'+space_id);
    var info_pane = $('#'+info_id);
    
    var _Store={
      keys: { id: 0, title: 1, link: 2, from: 3, til: 4 , color: 5, slot: 6, days: 7},
      events: [],
      daymap: {}
    };

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
        'width:14.2857142857%;' +
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
    
    var _fill_timer;
    _Env.fill_events = function(){
      clearTimeout(_fill_timer);
      _fill_timer = setTimeout(function(){
        Calendar.fill_visible(_Env, _Store);
      }, 100);
    }
    
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

    var _store_pos_delay;
    if (typeof(sessionStorage) !='undefined'){
      _Env.store_pos = function(){
        clearTimeout(_store_pos_delay);
        _store_pos_delay = setTimeout(function(){
          sessionStorage.setItem(space_id + '.scroll', target.scrollTop());
          console.log('storing '+target.scrollTop());
        }, 1000);
      };
      _Env.today = function(){
        var sel = target.find('.today-anchor')
        if(sel && sel.offset()){
          $('#event-calendar').scrollTop(sel.offset().top - (target.height()/3));
        }
      };
      _Env.restore_pos = function(){
        if(sessionStorage.getItem(space_id + '.scroll') !== null){
          console.log('restoring '+sessionStorage.getItem(space_id + '.scroll'));
          target.scrollTop(sessionStorage.getItem(space_id + '.scroll'));
        }
        else{
          console.log('restoring today');
          _Env.today();
        }
      };
    }else{
      _Env.store_pos = function(){};
      _Env.restore_pos = function(){};
    }
    
    var cell_generator = function(row, col, attrs){
      var date = _Env.coordinate_to_date({ row: row, col: col });
      var classes = 'cell';
      if(Time.is_in_last_week(date)){ classes += ' in-last-week'; }
      if(Time.is_last_day(date)){ classes += ' last-day'; }
      if(Time.to_date(date) == today){ classes += ' today'; }
      classes += ' month-'+(date.getMonth()+1);
      classes += ' row-'+row;
      classes += ' cell-'+col;
      var key = ''+date.getDate()+'-'+date.getMonth()+'-'+date.getFullYear();
      var date_str = ''+date.getFullYear()+'-'+(date.getMonth() < 9 ? '0':'')+(date.getMonth()+1)+'-'+(date.getDate() < 10 ? '0':'')+date.getDate();
      return '<div style="'+attrs+'"><div data-nr="'+col+'" data-date="'+date_str+'" class="'+classes+'"><span>'+date.getDate()+'</span><div class=inner data-key="'+key+'"></div></div></div>';
    };
    
    Calendar.create_today_anchor(_Env);
    Calendar.draw_month_headers(target, space_id, from, til, cell_height);
    Calendar.draw_window(_Env, rows, cell_generator);
    setTimeout(function(){ _Env.restore_pos(); }, 100);
    
    var _refresh_timer = null;
    target.scroll(function(e){
      clearTimeout(_refresh_timer);
      _refresh_timer = setTimeout(function(){
        Calendar.draw_window(_Env, rows, cell_generator);
        _Env.store_pos();
      }, 16);
    });
    
    var month_head_width = 30;
    var scroll_space_width = 20;
    var pane_width = 202;
    var calculate_panel_position = function(cell){
      var parent_width = info_pane.parent().width();
      var w = parent_width - month_head_width - scroll_space_width;
      var cell_width = w/7.0;
      var left = (cell.data('nr')*cell_width) + (cell_width/2) - (pane_width/2) + month_head_width;
      left = Math.max(month_head_width, left);
      left = Math.min(parent_width - scroll_space_width - pane_width, left);
      return left;
    };
    
    var _info_pane_timer;
    draw_target.on("mouseenter", "a", function(){
      clearTimeout(_info_pane_timer);
      window.ip = $(this);
      var event = $(this);
      var cell = event.closest('.cell');
      var pos = cell.parent().position();
      info_pane.removeClass('left').removeClass('right');
      if(cell.hasClass('cell-0')){ info_pane.addClass('left'); }
      if(cell.hasClass('cell-6')){ info_pane.addClass('right'); }
      info_pane.attr('style', event.attr('style')+';top:'+pos.top+'px;left:'+calculate_panel_position(cell)+'px');
      var info = $('<div class="content"></div>');
      info.text(event.attr('title'));
      info_pane.html('').append(info);
      info_pane.show();
    }).on("mouseleave", "a", function(){
      _info_pane_timer = setTimeout(function(){
        info_pane.hide();
      }, 1000);
    });
    
    var Api = {};
    Api.add_event = function(title, link, from, til, color){
      var id = _Store.events.length;
      var event = [id, title, link, from, til, color, 0, 0];
      _Store.events[id] = event;
      
      for(
        var day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
        day <= til;
        day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
      ){
        event[_Store.keys.days]++
        key = ""+day.getDate()+'-'+day.getMonth()+'-'+day.getFullYear();
        
        if(!_Store.daymap[key]){_Store.daymap[key] = [];}
        _Store.daymap[key].push(id);
        _Env.fill_events();
      }
    };
    Api.today = function(){ _Env.today(); };
    Api.store = function(){return _Store};
    return Api;
  }
};