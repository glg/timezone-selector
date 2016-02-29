var schedulable = /*@ngInject*/ function($document) {
    return {
        'restrict' : 'A',
        link: function (scope, element, attr) {
            element.on('mouseenter', schedMouseEnter);
            function schedMouseEnter(event) {
                console.log("Entered Schedulable", element[0].id);
                element.on('mousedown', schedMouseDown);
            }
            function schedMouseDown(event){
                event.preventDefault();
                event.stopPropagation();
                console.log("Mouse Down");
            }
        }
    };
};

exports.schedulable = schedulable;
