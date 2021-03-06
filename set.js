var set = {

    main: function() {
        // access this in the console as "set.current"
        this.current = set.create();
    },

    // Game Play Functions ------------------------------------------

    create: function() {
        var self = Object.create(this);
        // Try to get the game id from the url, if available
        var params = self.read_url_params();
        // Every card has 4 attributes
        self.NUM_ATTRS = 4;
        // Every attribute has 3 possible values
        self.NUM_VALUES = 3;
        // Number of cards shown initially
        self.NUM_INITIAL_CARDS = 12;
        // Number of cards to deal at a time
        self.NUM_AT_A_TIME = 3;
        // Number of cards in a row
        self.NUM_CARDS_PER_ROW = 3;
        // Whether to update url params every turn
        self.DO_URL_UPDATE = true;
        self.num_cards = Math.pow(self.NUM_VALUES, self.NUM_ATTRS);
        self.images = self.load_images();
        self.cards = self.make_deck(self.num_cards);
        // shown is a list of the cards to be shown.  The index is which place
        // on the screen it will be and the value is the number of the
        // card to show
        self.shown = [];
        // selected is a list of the cards selected.  The index is the number of
        // the card, the value is a boolean, true/false whether it is selected
        self.selected = [];
        // hinted is a list of the cards hinted, if any.  Similar to selected:
        // the index is the number of the card, the value is a boolean, true/false
        // whether it is hinted
        self.hinted = [];
        // found is a list of the sets that the user has found.  Each element is
        // the number of a card.  If three cards make up a set, then its up to
        // you to read found 3 cards at a time
        self.found = [];
        // times is a record of all the events: when the user finds a set, or
        // asks for more cards to be dealt, or picks an invalid set.
        self.times = [];
        // current_sets is a list of the sets that exist among the cards on the
        // screen.  Like the found list, it is just a list of cards, it's up
        // to you to read this list 3 cards at a time
        self.current_sets = [];
        self.is_find_all_mode = false;
        self.is_show_num_sets_mode = false;            

        self.setup_ui();
        self.init_game(params);
        window.onhashchange = function() {
            if (self.get_location().hash == window.location.hash) {
                // don't re-draw if not necessary.  That way, if the window
                // is showing a message, the message won't be reset or erased.
                return;
            }
            var params = self.read_url_params();
            if (self.DO_URL_UPDATE) {
                self.apply_url_params(params);
                self.deal();
                self.draw();
            } else {
                self.init_game(params);
            }
        };
        return self;
    },

    // init_game is called for each new game
    init_game: function(params) {
        var self = this;
        self.cards.shuffle();
        self.shown = [];
        self.selected = [];
        self.hinted = [];
        self.found = [];
        self.times = [];
        self.current_sets = [];
        self.apply_url_params(params);
        self.deal();
        self.draw();
        self.record_event("start");
        return self;
    },

    params_to_hash: function(pairs, map) {
        if (!pairs) {
            pairs = window.location.hash.substring(1).split("&");
        }
        if (!map) {
            map = {};
        }
        var count = pairs.length;
        for (i = 0; i < count; i++) {
            var pair = pairs[i];
            var kv = pair.split('=', 2);
            map[kv[0]] = kv[1];
        }
        return map;
    },

    to_query_string: function(paramsAsMap) {
        var query = '';
        var obj = paramsAsMap;
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                if (query.length > 0) {
                    query = query + '&';
                }
                query = query + prop + '=' + obj[prop];
            }
        }
        return query;
    },

    read_url_params: function() {
        return this.params_to_hash();
    },

    apply_url_params: function(params) {
        if (!params) {
            return;
        }
        if (params.id) {
            this.cards.set_cards(params.id, params.current);
        }
        if ("find_all" in params) {
            this.is_find_all_mode = params.find_all == "true";
        }
        if (params.shown) {
            var result = this.cards.encoder.id_to_array(params.shown, params.nshown);
            if (result[0]) {
                this.shown = result[1];
            }
        }
    },

    get_updated_url_params: function() {
        var params = {
            find_all: this.is_find_all_mode,
            current: this.cards.get_current(),
            shown: this.cards.encoder.encode_array(this.shown),
            nshown: this.shown.length,
            id: this.cards.id(),
        };
        return params;
    },

    get_location: function(params) {
        if (!params) {
            params = this.get_updated_url_params();
        }
        var anchor = document.createElement("A");
        anchor.href = window.location.href;
        anchor.hash = this.to_query_string(params);
        return anchor;
    },

    update_url_params: function(params) {
        if (this.DO_URL_UPDATE) {
            window.location.hash = this.get_location(params).hash;
        }
    },

    // self.times is an array of events.  Each event is just a string
    // description of the event (should essentially be an enum), plus
    // a timestamp.  If the event is that a set was found, then we
    // also record the number of sets that were found.
    record_event: function(description, num_sets, url) {
        if (!url) {
            url = this.get_location().href;
        }
        this.times.push({description: description, datetime: new Date(), url: url});
        if (num_sets) {
            this.times[this.times.length - 1].num_sets = num_sets;
        }
        return self;
    },

    // this.last_url is a record of the url after the last time check_set
    // was called.  The idea is that if you are looking at past sets, you
    // have links to the state before each event, but you don't have a link
    // to the state after the last event.  So that's what this link is
    // supposed to be.
    set_last_url: function() {
        this.last_url = this.get_location().href;
    },

    // Make_deck returns the deck of cards.  The deck includes not only the
    // cards themselves, but also many operations you can do on the cards,
    // like shuffling, dealing, getting an id, setting the cards from an id
    //
    // The id is a string that uniquely identifies the order of the cards in
    // the deck.  That way, with this id, we can recreate a game.
    //
    // The id is generated by taking all of the cards and just appending them
    // in order like a string.  So if the order of the cards is [11, 53, 22, 3, ...]
    // the string starts out like 11532203...
    // Then, we encode this string of digits into an alphanumeric string, so it's
    // shorter.
    make_deck: function(num_cards) {
        var cards = {

            encoder: {
                alphabet: "abcdefghijklmnopqrstuvwxyz0123456789",
                separator: "-",
                chunk_size: 15,

                // encode an int in the given alphabet.  Note, input should be
                // a number, not a string
                encode_int: function(input, alphabet) {
                    if (!alphabet) {
                        alphabet = self.alphabet;
                    }
                    var hash = "";
                    var len = alphabet.length;
                    while (input) {
                        hash = alphabet[input % len] + hash;
                        input = parseInt(input / len, 10);
                    }
                    return hash;
                },

                // splits a string into chunks of size len or less.  If the length of
                // the string isn't a multiple of len, then the first chunk could
                // be shorter than len, and the rest will be of size len exactly.
                // It's important that the shorter chunk is the first one -- we rely
                // on that fact when we decode, because we don't know how long the
                // chunk should be, and we pad with leading zeros.  That's only safe to
                // do with the first chunk, since adding leading zeros to the first chunk
                // adds them to the left of the number, which doesn't change the number,
                // whereas adding zeros to any other chunk would be adding zeros to the
                // middle of the number, which obviously changes the number.
                split_string(input, len) {
                    if (!len) {
                        len = this.chunk_size;
                    }
                    var retval = [];
                    var last = 0;
                    for (var next = input.length % len; last < input.length; last = next, next += len) {
                        retval.push(input.substr(last, next - last));
                    }
                    return retval;
                },

                // this is a wrapper around encode_int: if the input int is really
                // large, then encode_int will give overflow errors.  In that case,
                // we first split up the int into chunks of length chunk_size (15 digits),
                // encode each chunk, then join the encodings with the separator ("-")
                // Note that the input int should be a string, not a number.
                encode: function(input, separator, alphabet, chunk_size) {
                    var self = this;
                    if (!alphabet) {
                        alphabet = self.alphabet;
                    }
                    if (!separator) {
                        separator = self.separator;
                    }
                    if (!chunk_size) {
                        chunk_size = self.chunk_size;
                    }
                    return self.split_string(input, chunk_size).map(function(elt) {
                        return self.encode_int(elt, alphabet);
                    }).join(separator);
                },

                // performs the inverse of the encode_int operation
                decode_int: function(hash, alphabet) {
                    var self = this;
                    if (!alphabet) {
                        alphabet = self.alphabet;
                    }
                    var output = 0;
                    var alen = alphabet.length;
                    var hlen = hash.length;
                    for (var ii = 0; ii < hlen; ii++) {
                        var ch = hash.charAt(ii);
                        output *= alen;
                        output += alphabet.indexOf(ch);
                    }
                    return output;
                },

                // create an array which is just elt repeated n times
                repeat: function(elt, n_times) {
                    var arr = [];
                    for (var ii = 0; ii < n_times; ii++) {
                        arr.push(elt);
                    }
                    return arr;
                },

                // pad the given string out to the given length, but adding
                // the pad string to the left side.  The pad string is assumed
                // to be a single character.
                leftpad: function(string, len, pad) {
                    return this.repeat(pad, len - (""+ string).length).join("") + string;
                },

                // decode is the inverse of encode.  It takes the encoded id,
                // splits it on the separator ("-") to get chunks, then decodes
                // each chunk.  If the resulting number if too small, it may
                // need to pad that number with leading zeros.  Then it concatenates
                // the decoded numbers together to get one bigint.  
                // the process of encoding and decoding may add leading zeros to the bigint,
                // but since it's an int, we assume leading zeros don't matter
                decode(hash, separator, alphabet, chunk_size) {
                    var self = this;
                    if (!alphabet) {
                        alphabet = self.alphabet;
                    }
                    if (!separator) {
                        separator = self.separator;
                    }
                    if (!chunk_size) {
                        chunk_size = self.chunk_size;
                    }
                    hash = hash.toLowerCase();
                    return hash.split("-").map(function(elt) {
                        var res = "" + self.decode_int(elt, alphabet);
                        res = self.leftpad(res, chunk_size, "0");
                        return res;
                    }).join("");
                },

                arr_string: function(arr) {
                    var self = this;
                    var padsize = Math.floor(Math.log10(arr.length)) + 1;
                    return arr.map(function(elt) {
                        return self.leftpad(elt, padsize, "0");
                    }).join("");
                },

                encode_array: function(arr) {
                    return this.encode(this.arr_string(arr));
                },

                // This takes the string id, decodes it to get the concatenation of
                // all the cards in the deck, and transforms that into a deck of cards.
                // Along the way, it does some sanity checking that we didn't see
                // the same card multiple times, and that the resulting array encodes
                // to the same id that we were given.  
                // Returns an array of [bool-whether-the-id-is-valid, resulting-array]
                // It's up to the caller to actually set this.cards to the resulting
                // array, this function by itself is non-mutating.
                id_to_array: function(id, len) {
                    if (!len) {
                        len = this.cards.length;
                    }
                    var order = this.decode(id);
                    var padsize = Math.floor(Math.log10(len)) + 1;
                    order = order.substr(-padsize * len);
                    var seen = {};
                    var arr = [];
                    var is_success = true;
                    for (var ii = 0; ii < len; ii++) {
                        arr[ii] = parseInt(order.substr(ii*padsize, padsize), 10);
                        if (arr[ii] in seen) {
                            console.log("ERROR: id " + id +
                                    " results in malformed deck (same card multiple times: "
                                    + arr[ii]);
                            is_success = false;
                        }
                        seen[arr[ii]] = 1;
                    }
                    var new_id = this.encode(this.arr_string(arr));
                    if (id != new_id) {
                        console.log("ERROR: id " + id + " is decoded to the wrong thing " + new_id); 
                        is_success = false;
                    }
                    return [is_success, arr];
                },
            }, // end encoder

            // the cards data structure is just a permutation of the cards, which
            // are the numbers from 0 to 80 (or whatever the deck size is)
            cards: [],

            init: function() {
                for (var ii = 0; ii < num_cards; ii++) {
                    this.cards.push(ii);
                }
                this.shuffle();
                return this;
            },

            randint: function(min, max) {
                min = Math.ceil(min);
                max = Math.floor(max);
                return Math.floor(Math.random() * (max - min)) + min;
            },

            // This takes an id and actually sets cards to the resulting
            // deck from the id (if it's a valid id).  Returns true if the
            // cards were set, false otherwise.
            set_cards: function(id, current) {
                var result = this.encoder.id_to_array(id, this.cards.length);
                if (result[0]) {
                    this.cards = result[1];
                }
                if (current) {
                    this.current = current;
                }
                return result[0];
            },

            id: function() {
                return this.encoder.encode_array(this.cards);
            },

            get_current: function() {
                return this.current;
            },

            shuffle: function() {
                var self = this;
                for (var ii = 0; ii < this.cards.length; ii++) {
                    var swap = this.randint(0, this.cards.length - 1);
                    var temp = this.cards[ii];
                    this.cards[ii] = this.cards[swap];
                    this.cards[swap] = temp;
                }
                this.current = 0;
                return this;
            },

            is_eod: function() {
                return this.current >= this.cards.length;
            },

            num_remaining: function() {
                return this.cards.length - this.current;
            },

            get_next_card: function() {
                if (!this.is_eod()) {
                    return this.cards[this.current++];
                }
            },
        }
        return cards.init();
    },

    is_set: function(cards) {
        if (cards.length != this.NUM_VALUES) {
            return false;
        }
        for (var ii = 0, mask = 1; ii < this.NUM_ATTRS; ii++, mask *= this.NUM_VALUES) {
            var allsame = true;
            var alldifferent = true;
            var vals = [];
            var possibles = this.cards.encoder.repeat(false, this.NUM_VALUES);
            for (var jj = 0; jj < this.NUM_VALUES; jj++) {
                vals[jj] = Math.floor((cards[jj] % (mask * this.NUM_VALUES)) / mask);
                if (possibles[vals[jj]]) {
                    alldifferent = false;
                }
                possibles[vals[jj]] = true;
                if (jj > 0 && vals[jj] != vals[0]) {
                    allsame = false;
                }
            }
            if (!allsame && !alldifferent) {
                return false;
            }
        }
        return true;
    },

    deal: function(num_to_show) {
        var self = this;
        var dealt = false;
        if (self.cards.is_eod() && !self.set_exists()) {
            self.message("End of Deck!", true);
            return dealt;
        }
        if (num_to_show === undefined) {
            num_to_show = self.NUM_INITIAL_CARDS;
        }
        while (!self.cards.is_eod() && self.shown.length < num_to_show) {
            self.shown.push(self.cards.get_next_card());
            dealt = true;
        }
        // call set_exists once to set current_sets
        self.set_exists();
        self.update_url_params();
        return dealt;
    },

    contains: function(selected, found) {
        var self = this;
        for (var ii = 0; ii < found.length; ii += self.NUM_VALUES) {
            var all_found = true;
            for (var jj = 0; jj < self.NUM_VALUES; jj++) {
                var is_found = false;
                for (var kk = 0; kk < self.NUM_VALUES; kk++) {
                    if (selected[kk] == found[ii + jj]) {
                        is_found = true;
                        break;
                    }
                }
                if (!is_found) {
                    all_found = false;
                    break;
                }
            }
            if (all_found) {
                return true;
            }
        }
        return false;
    },

    // this figures out what sets exist among the cards currently
    // being shown, and saves that information in current_sets
    set_exists: function() {
        var self = this;
        self.current_sets = [];
        if (self.shown.length < self.NUM_VALUES) {
            return false;
        }

        // Loop over all sets of N_VALUES cards.
        // First start with the cards in positions {0, 1, 2},
        // then {0, 1, 3}, {0, 1, 4}, ... {0, 1, 11}, {0, 2, 3},
        // {0, 2, 4}, etc.
        var possible_set = [];
        for (var ii = 0; ii < self.NUM_VALUES; ii++) {
            possible_set[ii] = ii;
        }
        while (true) {
            var as_cards = possible_set.map(function(pos) { return self.shown[pos]; });
            if (self.is_set(as_cards)) {
                for (var ii = 0; ii < possible_set.length; ii++) {
                    self.current_sets.push(self.shown[possible_set[ii]]);
                }
            }
            // If it isn't a set, we've got to increment to the next possible
            // set.
            for (var ii = self.NUM_VALUES - 1; ii >= 0; ii--) {
                possible_set[ii]++;
                // In most cases, we can just increment the least significant
                // bit. But once the least significant bit is as high as it can
                // go, we've got to continue to the next bit and increment that
                // one.
                //
                // The highest each bit can go is only high enough that all the
                // bits after it can still be less than the number of cards
                // shown.
                if (possible_set[ii] < self.shown.length - self.NUM_VALUES + ii + 1) {
                    // After we've set this bit, we have to set all the
                    // bits after it.
                    for (var jj = ii + 1; jj < self.NUM_VALUES; jj++) {
                        possible_set[jj] = possible_set[jj - 1] + 1;
                    }
                    break;
                }
                // If this is the most significant bit, then we've tried
                // everything.
                if (ii == 0) {
                    return self.current_sets.length > 0;
                }
            }
        }
    },

    get_selected: function() {
        var self = this;
        var selected_pictures = [];
        var selected_positions = [];
        for (var ii = 0; ii < self.shown.length; ii++) {
            if (self.selected[self.shown[ii]]) {
                selected_pictures.push(self.shown[ii]);
                selected_positions.push(ii);
            }
        }
        return [selected_pictures, selected_positions];
    },

    check_set: function() {
        var self = this;
        var msg = "";
        var selected_info = this.get_selected();
        var selected_pictures = selected_info[0];
        var selected_positions = selected_info[1];
        if (selected_pictures.length < self.NUM_VALUES) {
            if (!self.is_find_all_mode) {
                msg = self.cards.num_remaining() + " cards remaining. ";
            }
            self.message(msg);
            return self;
        }
        if (!self.is_set(selected_pictures)) {
            msg = "Not a set! ";
            self.record_event("invalid-set");
        } else if (self.is_find_all_mode && self.contains(selected_pictures, self.found)) {
            msg = "You already found that set. ";
        } else {
            for (var ii = 0; ii < selected_positions.length; ii++) {
                self.found.push(self.shown[selected_positions[ii]]);
            }
            var num_sets = self.current_sets.length / self.NUM_VALUES;
            self.record_event("set", num_sets);
            if (self.is_find_all_mode) {
                if (self.found.length == self.current_sets.length) {
                    msg = "Found all " + num_sets + " sets! ";
                } else {
                    msg = "Found a set (" + (self.found.length / self.NUM_VALUES) + " sets found) ";
                }
            } else {
                msg = "Found a set! (Out of " + num_sets + " sets in view) ";
                if (self.shown.length <= self.NUM_INITIAL_CARDS && !self.cards.is_eod()) {
                    for (var ii = 0; ii < selected_positions.length; ii++) {
                        self.shown[selected_positions[ii]] = self.cards.get_next_card();
                    }
                } else {
                    var ii = 0;
                    var num_shown = self.shown.length;
                    for (var pos = num_shown - 1; pos > num_shown - 1 - self.NUM_VALUES; pos--) {
                        if (!self.selected[self.shown[pos]]) {
                            self.shown[selected_positions[ii]] = self.shown[pos];
                            ii++; 
                        }
                        self.shown.pop();
                    }
                }
            }
            if (self.times.length > 1) {
                var time_taken = self.times[self.times.length-1].datetime - self.times[self.times.length-2].datetime;
                msg += self.format_time(time_taken) + " ";
            }
        }
        for (var ii = 0; ii < selected_pictures.length; ii++) {
            self.selected[selected_pictures[ii]] = false;
            self.hinted[selected_pictures[ii]] = false;
        }
        if (!self.is_find_all_mode) {
            msg += self.cards.num_remaining() + " cards remaining.  ";
        }
        self.message(msg);
        self.deal();
        self.set_last_url();
        self.update_num_sets();
    },

    // Drawing Functions --------------------------------------------

    load_images: function() {
        var images = [];
        for (var ii = 0; ii < this.num_cards; ii++) {
            images.push(new Image());
            images[ii].src = "pics/" + (ii+1) + ".gif";
        }
        return images;
    },

    addEventListener: function(el, type, fn) { 
        if (el.addEventListener) { 
            el.addEventListener(type, fn, false); 
            return true; 
        } else if (el.attachEvent) { 
            var r = el.attachEvent("on" + type, fn); 
            return r; 
        } else { 
            return false; 
        } 
    },

    format_time: function(ms) {
        var retval = "";
        ms = Math.floor(ms);
        var mins = Math.floor(ms / 60 / 1000);
        ms -= mins * 60 * 1000;
        if (mins > 0) {
            retval = mins + " mins, ";
        }
        retval += ms / 1000 + " sec";
        return retval;
    },

    add_child_element: function(par, type) {
        var elt = document.createElement(type);
        par.appendChild(elt);
        return elt;
    },

    add_time_col: function(times, idx, tr) {
        var td = this.add_child_element(tr, "TD");
        var this_times = this.get_set_time(times, idx);
        td.innerHTML = this.format_time(this_times[0]);
        td = this.add_child_element(tr, "TD");
        td.innerHTML = this.format_time(this_times[1]);
        td = this.add_child_element(tr, "TD");
        if ("num_sets" in times[idx]) {
            td.innerHTML = "(" + times[idx].num_sets + " sets)";
        }
        td = this.add_child_element(tr, "TD");
        if ("url" in times[idx]) {
            var href = this.add_child_element(td, "A");
            href.href = times[idx].url;
            href.innerHTML = "restore";
        }
    },

    add_events: function(times, idx, tr, table) {
        var self = this;
        while (times && idx < times.length && times[idx].description != "set") {
            var td = this.add_child_element(tr, "TD");
            td.innerHTML = times[idx].description + " - " + times[idx].datetime;
            td.colSpan = self.NUM_CARDS_PER_ROW;
            self.add_time_col(times, idx, tr);
            idx++;
            tr = this.add_child_element(table, "TR");
        }
        return [tr, idx];
    },

    add_last_url: function(table) {
        if (this.last_url) {
            var tr = this.add_child_element(table, "TR");
            var td = this.add_child_element(tr, "TD");
            var href = this.add_child_element(td, "A");
            href.href = this.last_url;
            href.innerHTML = "restore";
        }
    },

    // for a given set in the times array, return the
    // time of that set, from the previous event of any
    // type, plus the cummulative time to find this set,
    // including the times of any invalid events
    get_set_time: function(times, idx) {
        if (idx == 0) {
            return [0, 0];
        }
        var prev;
        for (prev = idx - 1; prev >= 0; prev--) {
            // we want to know how long it took to find
            // this set.  It's probably the timestamp of
            // this set minus the timestamp of the previous event
            // But, if the previous event was an invalid set or
            // invalid deal attempt, then those times should be
            // counted with the time to find this set.
            if (!times[prev].description.startsWith("invalid-")) {
                break;
            };
        }
        return [times[idx].datetime - times[idx-1].datetime, 
        times[idx].datetime - times[prev].datetime]; 
    },

    make_set_time_list: function(times) {
        var self = this;
        var set_times = [];
        times.forEach(function(elt, idx, arr) {
            if (elt.description == "set" && idx > 0) {
                var this_times = self.get_set_time(arr, idx);
                // use the cummulative time for this set
                set_times.push(this_times[1]);
            }
        });
        return set_times;
    },

    get_arr_stats: function(arr) {
        arr.sort(function(a, b) {
            return a - b;
        });
        var sum = arr.reduce((previous, current) => current += previous);
        return {
            median: arr[Math.floor(arr.length / 2)],
            average: sum / arr.length,
            max: Math.max.apply(null, arr),
            min: Math.min.apply(null, arr),
        };
    },

    draw_table: function(id, arr, onclick, selected, hinted, times) {
        var self = this;
        var table = document.getElementById(id);
        // remove the existing table
        function remove_children(node) {
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
        }
        remove_children(table);
        // create a new table
        var time_idx = 0;
        var tr = self.add_child_element(table, "TR");
        if (times) {
            var set_times = self.make_set_time_list(times);
            if (set_times.length > 0) {
                var stats = self.get_arr_stats(set_times);
                var td = self.add_child_element(tr, "TD");
                td.colSpan = self.NUM_CARDS_PER_ROW;
                td.innerHTML = 
                    ["median", "average", "max", "min"].map(function(elt) {
                        return elt + ": " + self.format_time(stats[elt]);
                    }).join("<br>");
                tr = self.add_child_element(table, "TR");
            }
        }
        for (var ii = 0; ii < arr.length; ii++) {
            // first, add any non-set events that occurred since the
            // last set event.
            var info = self.add_events(times, time_idx, tr, table);
            tr = info[0];
            time_idx = info[1];
            var td = self.add_child_element(tr, "TD");
            var img = self.add_child_element(td, "IMG");
            td.attributes["pic_id"] = arr[ii];
            this.render_selected(td, selected && selected[arr[ii]], hinted && hinted[arr[ii]]);
            img.src = this.images[arr[ii]].src;
            if (onclick) {
                this.addEventListener(img, "click", function (evt) { return onclick.call(self, evt); });
            }
            if ((ii + 1) % this.NUM_CARDS_PER_ROW == 0) {
                if (times && time_idx < times.length && times[time_idx].description == "set") {
                    self.add_time_col(times, time_idx, tr);
                    time_idx++;
                }
                tr = self.add_child_element(table, "TR");
            }
        }
        self.add_events(times, time_idx, tr, table);
        if (times) {
            self.add_last_url(table);
        }
    },

    set_toggle_display: function(button_id, div_id) {
        var button = document.getElementById(button_id);
        this.addEventListener(button, "click", function() {
            var div_elt = document.getElementById(div_id);
            var display = div_elt.style.display;
            if (display == "none") {
                div_elt.style.display = "inline";
            } else {
                div_elt.style.display = "none";
            }
        });
        return this;
    },

    update_num_sets: function() {
        var self = this;
        var obj = document.getElementById("num-sets");
        if (self.is_show_num_sets_mode) {
            obj.value = (self.current_sets.length / self.NUM_VALUES) + " sets";
            if (self.is_find_all_mode) {
                obj.value +=
                    " (" + (self.found.length / self.NUM_VALUES) + " found)";
            }
        } else {
            obj.value = "# Sets";
        }
    },

    setup_ui: function() {
        var self = this;
        this.set_toggle_display("show-past-sets", "past-sets-div");
        this.set_toggle_display("show-sets", "current-sets-div");
        var new_game = document.getElementById("new-game");
        this.addEventListener(new_game, "click", function (obj) {
            obj.target.value = "New Game";
            return self.init_game();
        });
        var restart = document.getElementById("restart");
        this.addEventListener(restart, "click", function (obj) {
            var params = self.get_updated_url_params();
            if (!self.is_find_all_mode) {
                delete params.current;
                delete params.shown;
                delete params.nshown;
            }
            return self.init_game(params);
        });
        var find_all = document.getElementById("find-all");
        this.addEventListener(find_all, "click", function (obj) {
            self.is_find_all_mode = !self.is_find_all_mode;
            self.found = [];
            self.times = [];
            self.record_event("start");
            // self.init_game();
            self.update_url_params();
            self.draw();
        });
        var num_sets = document.getElementById("num-sets");
        this.addEventListener(num_sets, "click", function (obj) {
            self.is_show_num_sets_mode = !self.is_show_num_sets_mode;
            self.update_num_sets();
        });
        var deal_button = document.getElementById("deal");
        this.addEventListener(deal_button, "click", function(obj) {
            var url = self.get_location().href;
            if (self.set_exists()) {
                self.message("A set already exists!");
                self.record_event("invalid-deal-attempt");
            } else {
                var dealt = self.deal(self.shown.length + self.NUM_AT_A_TIME);
                self.draw();
                if (dealt) {
                    self.record_event("no-sets-exist", null, url);
                }
            }
        });
        var auto_button = document.getElementById("auto");
        this.addEventListener(auto_button, "click", function(obj) {
            var url = self.get_location().href;
            self.clear_selected();
            selected_pictures = self.find_a_set();
            if (selected_pictures.length == 0) {
                var dealt = self.deal(self.shown.length + self.NUM_AT_A_TIME);
                self.draw();
                if (dealt) {
                    self.record_event("no-sets-exist", null, url);
                }
            }
            for (var ii = 0; ii < selected_pictures.length; ii++) {
                self.selected[selected_pictures[ii]] = true;
            }
            self.draw();
        });
        var hint_button = document.getElementById("hint");
        this.addEventListener(hint_button, "click", function(obj) {
            self.clear_hinted();
            selected_pictures = self.find_a_set(true);
            if (selected_pictures.length == 0) {
                selected_pictures = self.find_a_set();
            }
            for (var ii = 0; ii < selected_pictures.length; ii++) {
                if (!self.selected[selected_pictures[ii]]) {
                    self.hinted[selected_pictures[ii]] = true;
                    break;
                }
            }
            self.draw();
        });
        return this;
    },

    clear_selected: function() {
        var self = this;
        for (var ii = 0; ii < self.num_cards; ii++) {
            self.selected[ii] = false;
        }
    },

    clear_hinted: function() {
        var self = this;
        for (var ii = 0; ii < self.num_cards; ii++) {
            self.hinted[ii] = false;
        }
    },

    find_a_set: function(filter_by_selected) {
        var self = this;
        var pics_to_select = [];
        var selected_pictures;
        if (filter_by_selected) {
            selected_pictures = this.get_selected()[0];
        }
        for (var ii = 0; ii < self.current_sets.length; ii++) {
            pics_to_select.push(self.current_sets[ii]);
            if (pics_to_select.length ==  self.NUM_VALUES) {
                if (self.contains(pics_to_select, self.found)) {
                    pics_to_select = [];
                } else {
                    if (selected_pictures) {
                        for (var jj = 0; jj < selected_pictures.length; jj++) {
                            if (pics_to_select.filter(function(e) {
                                return e == selected_pictures[jj];
                            }).length == 0) {
                                pics_to_select = [];
                                break;
                            }
                        }
                    }
                }
                if (pics_to_select.length == self.NUM_VALUES) {
                    break;
                }
            }
        }
        return pics_to_select;
    },

    set_new_game_button: function(is_game_over) {
        var new_game = document.getElementById("new-game");
        if (is_game_over) {
            new_game.value = "Game Over";
        } else {
            new_game.value = "New Game";
        }
    },

    set_mode_button: function(is_find_all_mode) {
        var find_all = document.getElementById("find-all");
        if (is_find_all_mode) {
            find_all.value = "Mode: Find All";
        } else {
            find_all.value = "Mode: Normal";
        }
    },

    render_selected: function(obj, is_selected, is_hinted) {
        if (is_selected) {
            // XXX not sure what the problem is with my CSS
            obj.className = "selected";
            obj.style.backgroundColor = "red";
        } else if (is_hinted) {
            obj.className = "";
            obj.style.backgroundColor = "blue";
        } else {
            obj.className = "";
            obj.style.backgroundColor = "";
        }
        return obj;
    },

    on_select_card: function(evt) {
        var self = this;
        var obj = evt.target.parentNode;
        var cls = obj.className;
        self.hinted[obj.attributes["pic_id"]] = false;
        if (cls == "selected") {
            self.render_selected(obj, false);
            self.selected[obj.attributes["pic_id"]] = false;
        } else {
            self.render_selected(obj, true);
            self.selected[obj.attributes["pic_id"]] = true;
        }
        self.draw();
    },

    draw: function() {
        var self = this;
        this.check_set();
        var is_game_over = false;
        if (self.is_find_all_mode) {
            is_game_over = self.found.length == self.current_sets.length;
        } else {
            is_game_over = self.cards.is_eod() && !self.set_exists();
        }
        self.set_new_game_button(is_game_over);
        self.set_mode_button(self.is_find_all_mode);
        this.update_num_sets();
        this.draw_table("card-table", this.shown, this.on_select_card, this.selected, this.hinted);
        this.draw_table("past-sets-table", this.found, undefined, undefined, undefined, this.times);
        this.draw_table("current-sets-table", this.current_sets);
    },

    message: function(msg, should_append) {
        var obj = document.getElementById("messages");
        if (should_append) {
            obj.value += msg;
        } else {
            obj.value = msg;
        }
    },
};

// -------------------------------------------------------------- //

set.main();

// -------------------------------------------------------------- //
