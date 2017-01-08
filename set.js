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
        for (var ii = 0; ii < self.NUM_INITIAL_CARDS; ii++) {
            self.shown.push(self.cards.get_next_card());
        }
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
                vals[jj] = (cards[jj] % (mask * this.NUM_VALUES)) / mask;
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

    check_set: function() {
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

    draw_table: function(id, arr, onclick) {
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
        }
        this.check_set();
        this.draw_table("card-table", this.shown, select_card);
    },
};

// -------------------------------------------------------------- //

set.main();

// -------------------------------------------------------------- //
