var Options = Class.extend({
    type: "options",

    init: function(self) {
        self.particles = {
            style: 'line',
        }

        $('#pstyle input').on('change', function() {
            self.particles.style = $('#pstyle input:checked').val();
        });
    },
});
