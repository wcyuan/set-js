var set = {
    // Every card has 4 attributes
    NUM_ATTRS = 4,
    // Every attribute has 3 possible values
    NUM_VALUES = 3,
    // Number of cards shown initially
    NUM_INIT_CARDS: 12,
    // Number of cards to deal at a time
    NUM_AT_A_TIME: 3,    

    main: function() {
        this.num_cards = Math.pow(this.NUM_VALUES, this.NUM_ATTRS);
        this.images = this.load_images();
        this.cards = this.make_deck(this.num_cards);
        this.shown = [];
        this.selected = [];
        this.found = [];
        this.current_sets = [];
            
    },

    load_images() {
        var images = [];
        for (var ii = 0; ii < this.num_cards; ii++) {
            images.push(new Image());
            images[ii].src = "pics/" + (ii+1) + ".gif";
        }
        return images;
    },

    randint = function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    },

    make_deck(num_cards) {
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
};

// -------------------------------------------------------------- //

set.main();

// -------------------------------------------------------------- //
