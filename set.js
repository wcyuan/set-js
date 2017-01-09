// Todo:
//   [ ] function to draw the card table
//       makes it from scratch every time?
//   [ ] function to draw everything
//       draws card tables
//       updates button labels
//   [ ] if a card is selected, its td has style selected
//   [ ] add style sheet so that class selected is yellow
//   [ ] when you click on a card, it is selected
//   [ ] when 3 cards are selected, check to see if they are a set
//      [ ] if so, deal + recompute current sets
//      [ ] if no more sets, game over and selecting cards won't do anything
//      [ ] when dealing, only deal the minimum, and make the user ask for more
//          if they ask for more when not necessary, don't deal, just write a message
//   [ ] set up the buttons, add functions to each of the buttons
//   [ ] add a timer to show how long it took you to find a set
//   [ ] keep track of stats (total time, time per set, etc)
//   [ ] add a point system?
//

var set = {

    main: function() {
        this.current = set.create();
    },

    // Game Play Functions ------------------------------------------

    create: function() {
        var self = Object.create(this);
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
        self.found = [];
        self.current_sets = [];
        self.is_find_all_mode = false;
        self.is_show_num_sets_mode = false;            
        self.setup_ui();
        self.init_game();
        return self;
    },

    init_game: function() {
        var self = this;
        self.cards.shuffle();
        self.shown = [];
        self.selected = [];
        self.found = [];
        self.current_sets = [];
        self.deal();
        self.draw();
        return self;
    },

    make_deck: function(num_cards) {
        var cards = {
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
            shuffle: function() {
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
            get_next_card: function() {
                if (!this.is_eod()) {
                    return this.cards[this.current++];
                }
            },
        }
        return cards.init();
    },

    repeat: function(elt, n_times) {
        var arr = [];
        for (var ii = 0; ii < n_times; ii++) {
            arr.push(elt);
        }
        return arr;
    },

    is_set: function(cards) {
        if (cards.length != this.NUM_VALUES) {
            return false;
        }
        for (var ii = 0, mask = 1; ii < this.NUM_ATTRS; ii++, mask *= this.NUM_VALUES) {
            var allsame = true;
            var alldifferent = true;
            var vals = [];
            var possibles = this.repeat(false, this.NUM_VALUES);
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

    deal: function() {
        var self = this;
        if (self.cards.is_eod() && !self.set_exists()) {
            self.message("End of Deck!");
            return;
        }
        while (!self.cards.is_eod() && (!self.set_exists() || self.shown.length < self.NUM_INITIAL_CARDS)) {
            self.shown.push(self.cards.get_next_card());
        }
    },

    contains: function(selected, found) {
        var self = this;
        for (var ii = 0; ii < found.length; ii += self.NUM_VALUES) {
            var all_found = true;
            for (var jj = 0; jj < self.NUM_VALUES; jj++) {
                var found = false;
                for (var kk = 0; kk < self.NUM_VALUES; kk++) {
                    if (selected[kk] == found[ii + jj]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
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

    check_set: function() {
        var selected_pictures = [];
        var selected_positions = [];
        var self = this;
        for (var ii = 0; ii < self.shown.length; ii++) {
            if (self.selected[self.shown[ii]]) {
                selected_pictures.push(self.shown[ii]);
                selected_positions.push(ii);
            }
        }
        if (selected_pictures.length < self.NUM_VALUES) {
            return self;
        }
        if (!self.is_set(selected_pictures)) {
            self.message("Not a set!");
        } else if (self.is_find_all_mode && self.contains(selected_pictures, self.found)) {
            self.message("You already found that set");
        } else {
            var msg = "Found a set!";
            if (self.is_find_all_mode && !self.is_show_num_sets_mode) {
                msg += " (Out of " + (self.current_sets.length / self.NUM_VALUES) + " sets in view)";
            }
            self.message(msg);
            for (var ii = 0; ii < selected_positions.length; ii++) {
                self.found.push(self.shown[selected_positions[ii]]);
            }
            if (self.is_find_all_mode) {
                var new_game = document.getElementById("new-game");
                if (self.found.length == self.current_sets.length) {
                    self.message("Found all " + (self.current_sets.length / self.NUM_VALUES) + " sets!");
                    new_game.value = "Game Over";
                } else {
                    new_game.value = "New Game";
                }
            } else {
                if (self.shown.length <= self.NUM_INITIAL_CARD && !self.cards.is_eod()) {
                    for (var ii = 0; ii < self.selected_positions; ii++) {
                        self.shown[self.selected_positions[ii]] = self.cards.get_next_card();
                    }
                } else {
                    var ii = 0;
                    var num_shown = self.shown.length;
                    for (var pos = num_shown - 1; pos > num_shown - 1 - self.NUM_VALUES; pos--) {
                        if (!self.selected[self.shown[pos]]) {
                            self.shown[selected_positions[ii]] = self.shown[pos];
                            ii--; 
                        }
                        self.shown.pop();
                    }
                }
            }
        }
        for (var ii = 0; ii < selected_pictures.length; ii++) {
            self.selected[selected_pictures[ii]] = false;
        }
        self.deal();
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

    draw_table: function(id, arr, onclick, selected) {
        var table = document.getElementById(id);
        function remove_children(node) {
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
        }
        remove_children(table);
        var tr;
        for (var ii = 0; ii < arr.length; ii++) {
            if (ii % this.NUM_CARDS_PER_ROW == 0) {
                tr = document.createElement("TR");
                table.appendChild(tr);
            }
            var td = document.createElement("TD");
            tr.appendChild(td);
            img = document.createElement("IMG");
            td.appendChild(img);
            td.attributes["pic_id"] = arr[ii];
            if (selected && selected[arr[ii]]) {
                td.className = "selected";
                td.style.backgroundColor = "yellow";
            } else {
                td.className = "";
                td.style.backgroundColor = "";
            }
            img.src = this.images[arr[ii]].src;
            if (onclick) {
                this.addEventListener(img, "click", onclick);
            }
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
        this.addEventListener(new_game, "click", function () {
            return self.init_game();
        });
        var find_all = document.getElementById("find-all");
        this.addEventListener(find_all, "click", function (obj) {
            self.is_find_all_mode = !self.is_find_all_mode;
            if (self.is_find_all_mode) {
                obj.target.value = "Switch to Normal";
            } else {
                obj.target.value = "Switch to Find All";
            }
            self.init_game();
            self.update_num_sets();
        });
        var num_sets = document.getElementById("num-sets");
        this.addEventListener(num_sets, "click", function (obj) {
            self.is_show_num_sets_mode = !self.is_show_num_sets_mode;
            self.update_num_sets();
        });
        return this;
    },

    draw: function() {
        var self = this;
        function select_card(evt) {
            var obj = evt.target.parentNode;
            var cls = obj.className;
            if (cls == "selected") {
                obj.className = "";
                // XXX not sure what the problem is with my CSS
                obj.style.backgroundColor = "";
                self.selected[obj.attributes["pic_id"]] = false;
            } else {
                obj.className = "selected";
                obj.style.backgroundColor = "yellow";
                self.selected[obj.attributes["pic_id"]] = true;
            }
            self.draw();
        }
        this.check_set();
        this.draw_table("card-table", this.shown, select_card, this.selected);
        this.draw_table("show-past-sets", this.found);
        this.draw_table("show-sets", this.current_sets);
    },

    message: function(msg) {
        var obj = document.getElementById("messages");
        obj.value = msg;
    },
};

// -------------------------------------------------------------- //

set.main();

// -------------------------------------------------------------- //
