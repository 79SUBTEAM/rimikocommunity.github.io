counter = function(total, time, element) {
    const count = new countUp.CountUp(element, total, {duration: time});
    if (!count.error) {
    count.start();
    } else {
    console.error(count.error);
    }
}

$.fn.isInViewport = function() {
    var elementTop = $(this).offset().top;
    var elementBottom = elementTop + $(this).outerHeight();

    var viewportTop = $(window).scrollTop();
    var viewportBottom = viewportTop + $(window).height();

    return elementBottom > viewportTop+80 && elementTop < viewportBottom+80;
};

function writeAnimation(text, element, delayTime=0, timeout=10, i=0) {
    if (i == text.length+1) return;
    else if (timeout == 0) {
        $(element).html(text);
        return
    }
    setTimeout(
        ()=>{
            setTimeout(
                ()=>{
                    $(element).html(text.substr(0, i));
                    writeAnimation(text, element, delayTime=0, timeout=timeout, i=i+1)
                }, 
                timeout
            )
        },
        delayTime
    )
}

$(document).ready(()=>{
    $(document).on("click", "*[link]", function () {
        window.location = ($(this).attr("link"));
    });
    T_O = null

    $(window).scroll(function(){
        if (T_O) clearTimeout(T_O)
        T_O = setTimeout(()=>{
            for (i = 0; i < $("main .tab").length; i++) {
                if ($($("main .tab")[i]).isInViewport()) $($("main .tab")[i]).css({"animation": "showing 0.5s ease-in-out forwards"});
            }
        }, 15)
    });
    writeAnimation("The ultimate library for modifying Windows.",$("main #home .text #homeText")[0], delayTime=200, timeout=50);
})