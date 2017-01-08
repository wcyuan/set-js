// Todo:
//   [ ] function to draw the card table
//       makes it from scratch every time?
//   [ ] if a card is selected, its td has style selected
//   [ ] add style sheet so that class selected is yellow
//   [ ] when you click on a card, it is selected
//   [ ] when 3 cards are selected, check to see if they are a set
//      [ ] if so, deal + recompute current sets
//   [ ] set up the buttons, add functions to each of the buttons
//   [ ] add a timer to show how long it took you to find a set
//   [ ] keep track of stats (total time, time per set, etc)
//   [ ] add a point system?
//

var set = {
    // Every card has 4 attributes
    NUM_ATTRS: 4,
    // Every attribute has 3 possible values
    NUM_VALUES: 3,
    // Number of cards shown initially
    NUM_INITIAL_CARDS: 12,
    // Number of cards to deal at a time
    NUM_AT_A_TIME: 3,    
    // Number of cards in a row
    NUM_CARDS_IN_ROW: 3,

    main: function() {
        this.num_cards = Math.pow(this.NUM_VALUES, this.NUM_ATTRS);
        this.images = this.load_images();
        this.cards = this.make_deck(this.num_cards);
        this.shown = [];
        this.selected = [];
        this.found = [];
        this.current_sets = [];
        this.is_find_all_mode = false;
        this.is_show_num_sets_mode = false;            
    },

    load_images: function() {
        var images = [];
        for (var ii = 0; ii < this.num_cards; ii++) {
            images.push(new Image());
            images[ii].src = "pics/" + (ii+1) + ".gif";
        }
        return images;
    },

    randint: function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    },

    make_deck: function(num_cards) {
        return {
            cards: [],
            init: function() {
                for (var ii = 0; ii < num_cards; ii++) {
                    this.cards.push(ii);
                }
                this.shuffle();
                return this;
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
        return cards;
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
            if (ii % this.NUM_CARDS_IN_A_ROW == 0) {
                tr = document.createElement("TR");
                table.appendChild(tr);
            }
            var td = document.createElement("TD");
            tr.appendChild(td);
            img = document.createElement("IMG");
            td.appendChild(img);
            img.src = this.images[arr[ii]].src;
        }
    },
};

// -------------------------------------------------------------- //

set.main();

// -------------------------------------------------------------- //
