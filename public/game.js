
var stage;
var boardContent = $("#boardContainer");
var wsDomain = 'localhost';

var PI = 3.141592;

var fieldLayer       = new Konva.Layer();
var playerLayer      = new Konva.Layer();
var ballLayer        = new Konva.Layer();
var barLayer         = new Konva.Layer();
var playerAboveLayer = new Konva.Layer();
var width  = 650;
var height = 350;

var redScore = 0;
var redGames = 0;
var blueScore = 0;
var blueGames = 0;

var sendMsg = function() {

};

var connected = false;

var goalWidth = height / 3;

var friction = 0.2;  // higher is more friction
var wallDampen = 0.8;
var playerDampen = 0.6;
var catchDampen  = 0.3;

var offsetX = 150;
var offsetY = 220;

var playerHeight = width / 36;
var playerWidth = width / 72;
var playerRange = width / 24;
var handleHeight = width / 12;
var handleWidth = width / 32;

var barRoom = height * 0.6;      // the amount of space to move
var barCenter = barRoom / 2;
var barHeight = height + barRoom;
var barWidth  = width / 150;

var ballRadius = width / 64;

var barOffset1 = width * (1/16);
var barOffset2 = width * (3/16);
var barOffset3 = width * (5/16);
var barOffset4 = width * (7/16);
var barOffset5 = width * (9/16);
var barOffset6 = width * (11/16);
var barOffset7 = width * (13/16);
var barOffset8 = width * (15/16);

var barsById = {};

// how far up the bar each player is
var goalOffset  = height / 2;

var def1Offset = height * 0.30;
var def2Offset = height * 0.70;

var mid1Offset = height * 0.10;
var mid2Offset = height * 0.30;
var mid3Offset = height * 0.50;
var mid4Offset = height * 0.70;
var mid5Offset = height * 0.90;

var for1Offset = height * 0.25;
var for2Offset = height * 0.50;
var for3Offset = height * 0.75;

var currentGrippedBar = null;
var currentKeyBar     = null;

var bar1 = null;
var bar2 = null;
var bar3 = null;
var bar4 = null;
var bar5 = null;
var bar6 = null;
var bar7 = null;
var bar8 = null;

var blueScoreText = new Konva.Text({
    x: offsetX - 150,
    y: offsetY + (height / 2) - 10,
    text: 'Score: 0',
    fontSize: 20,
    fill: 'blue'
});
var redScoreText = new Konva.Text({
    x: offsetX + width + 50,
    y: offsetY + (height / 2) - 10,
    text: 'Score: 0',
    fontSize: 20,
    fill: 'red'
});

var debugText = new Konva.Text({
    x: 15,
    y: 15,
    text: 'debug text',
    fontSize: 20,
    fill: 'black'
});
var debugText2 = new Konva.Text({
    x: 15,
    y: 45,
    text: 'debug text2',
    fontSize: 20,
    fill: 'black'
});

///// create players
var playerFactory = function(bar, yOffset, color, backColor) {
    var player = {};
    player.imageCenter = new Konva.Circle({
        x: 0, // set by object that contains ball
        y: 0, // set by object that contains ball
        radius: 3,
        fill: 'black',
        stroke: 'black',
    });
    player.image = new Konva.Rect({
        x: 0, // set by object that contains player
        y: 0, // set by object that contains player
        width: playerWidth,
        height: playerHeight,
        fill: color,
        stroke: 'black',
        strokeWidth: 1,
        shadowColor: 'black',
        shadowBlur: 1,
        shadowOffset: { x: 0, y: 0 },
        shadowOpacity: 0.3
    });
    player.primaryColor = color;
    player.secondaryColor = backColor;
    player.yPos = yOffset;
    player.yBarPos = 0;
    // zero means down and we use sin() to determine length from bar (rather than the natural 0 being to the right)
    player.angle = 0;
    player.grounded = true;
    player.setX = function() {
        player.x = bar + (Math.sin(player.angle) * playerRange);
        player.image.setX(offsetX + player.x - (playerWidth / 2))
        player.imageCenter.setX(offsetX + player.x)
        return player.x;
    };
    player.setY = function(barPosition) {
        player.y = (player.yPos + barPosition - (barCenter));
        player.image.setY(offsetY + player.y - (playerHeight / 2));
        player.imageCenter.setY(offsetY + player.y)
    };
    player.setX();
    player.setAngle = function(angle) {
        player.angle = angle; 
        if (Math.cos(angle) < 0.3) { 
            if (player.grounded == true) {
                player.grounded = false;
                player.image.fill(player.secondaryColor);
                playerAboveLayer.add(player.image);
            }
        } else {
            if (player.grounded == false) {
                player.grounded = true;
                player.image.fill(player.primaryColor);
                playerLayer.add(player.image);
            }
        }
        return player.setX(); 
    }
    player.setY(barCenter);

    playerLayer.add(player.image);
    playerAboveLayer.add(player.imageCenter);

    return player;
};

var barFactory = function(id, barOffsetX, barRange, handleLoc, players) {
    var bar = {};
    bar.id = id;
    bar.maxTop    = barCenter + barRange;
    bar.maxBottom = barCenter - barRange;
    bar.x = barOffsetX;
    bar.playerX = barOffsetX;

    bar.dx = 0;
    bar.dy = 0;

    // used for determining momentum
    var time = new Date().getTime();
    bar.last_x_time = time;  // time of last x_1
    bar.last_x = 0
    bar.x_0_time = time;
    bar.x_1_time = time;
    bar.x_2_time = time;
    bar.x_3_time = time;
    bar.x_0    = 0
    bar.x_1    = 0
    bar.x_2    = 0
    bar.x_3    = 0

    bar.y_0_time = time;
    bar.y_1_time = time;
    bar.y_2_time = time;
    bar.y_3_time = time;
    bar.last_y = 0
    bar.y_0    = 0
    bar.y_1    = 0
    bar.y_2    = 0
    bar.y_3    = 0

    bar.players = players;
    bar.image = new Konva.Rect({
        x: 0, // set by object that contains this
        y: 0, // set by object that contains this
        width: barWidth,
        height: barHeight,
        fill: 'grey',
        stroke: 'black',
        strokeWidth: 1,
    });
    bar.handleImage = new Konva.Rect({
        x: 0, // set by object that contains this
        y: 0, // set by object that contains this
        width: handleWidth,
        height: handleHeight,
        fill: 'black',
        stroke: 'black',
        strokeWidth: 1,
        dragBoundFunc: (pos) => {
            return {
                x : offsetX + bar.x - (handleWidth / 2),
                y : pos.y
            }
        },
    });
    bar.gripped = false;
    bar.grippedX = 0;
    bar.grippedY = 0;
    bar.keyX = 0;
    bar.keyY = 0;

    bar.image.on('mousedown', function() {
        if (currentKeyBar != null) {
            currentKeyBar.image.fill('grey');
        }
        
        bar.keyX = 0;
        bar.keyY = 0;
        bar.last_x = 0;
        bar.last_y = 0;
        bar.currentOffsetY_old = bar.currentOffsetY;
        bar.currentOffsetX_old = bar.playerX;
        bar.clearMomentumX();
        bar.clearMomentumY();
        currentKeyBar = bar;
        currentKeyBar.image.fill('white');
        barLayer.draw();
    });

    bar.handleImage.on('mousedown', function() {
        var mousePos = stage.getPointerPosition();
        bar.grippedX = mousePos.x;
        bar.grippedY = mousePos.y;
        bar.last_x = 0;
        bar.last_y = 0;
        bar.currentOffsetY_old = bar.currentOffsetY;
        bar.currentOffsetX_old = bar.playerX;
        bar.gripped = true;
        bar.clearMomentumX();
        bar.clearMomentumY();
        currentGrippedBar = bar;
    });

    bar.currentOffsetY = barCenter;
    bar.currentOffsetY_old = barCenter;
    bar.setX = function() { 
        bar.image.setX(     offsetX + bar.x - (barWidth / 2))
        bar.handleImage.setX(offsetX + bar.x - (handleWidth / 2))
    };
    bar.setY = function() {
        bar.image.setY(      offsetY + this.currentOffsetY - barRoom)
        bar.handleImage.setY(offsetY + this.currentOffsetY + (handleLoc == 'top' ? -handleHeight : barHeight) - barRoom)
    };
    bar.setX();
    bar.setY();

    bar.moveXY = function(diffX, diffY) {
        bar.moveX(diffX);
        bar.moveY(diffY);
        heartbeat_msg = {
            "c"     : 'bar',
            'id'    : bar.id,
            'angle' : bar.getAngle(),
            'y'     : bar.currentOffsetY,
            'dx'    : bar.calculateMomentumX(),
            'dy'    : bar.calculateMomentumY(),
        };
        sendMsg(heartbeat_msg);
    };

    bar.moveX = function(diff) {
        var time = new Date().getTime();

        bar.x_3      = bar.x_2;
        bar.x_3_time = bar.x_2_time;
        bar.x_2      = bar.x_1;
        bar.x_2_time = bar.x_1_time;
        bar.x_1      = bar.x_0;
        bar.x_1_time = bar.x_0_time;

        bar.x_0 = bar.last_x - diff;
        bar.x_0_time = time;

        bar.last_x = diff;

        bar.players.forEach(function(player) {
            bar.playerX = player.setAngle(diff / (width / 8));
        });
    }

    bar.getAngle = function() {
        return bar.players[0].angle;
    };
    bar.setAngle = function(angle) {
        bar.players.forEach(function(player) {
            bar.playerX = player.setAngle(angle);
        });
    }

    bar.moveY = function(diff) {
        var time = new Date().getTime();

        bar.y_3      = bar.y_2;
        bar.y_3_time = bar.y_2_time;
        bar.y_2      = bar.y_1;
        bar.y_2_time = bar.y_1_time;
        bar.y_1      = bar.y_0;
        bar.y_1_time = bar.y_0_time;

        bar.y_0 = bar.last_y - diff;
        bar.y_0_time = time;

        bar.last_y = diff;

        bar.currentOffsetY = (bar.currentOffsetY_old + diff);
        if (bar.currentOffsetY > bar.maxTop)    { bar.currentOffsetY = bar.maxTop; }
        if (bar.currentOffsetY < bar.maxBottom) { bar.currentOffsetY = bar.maxBottom; }
        bar.setY();
        bar.players.forEach(function(player) {
            player.setY(bar.currentOffsetY);
        });
    }
    //
    bar.getMomentumY = function() {
        return bar.dy;
    }
    bar.calculateMomentumY = function() {
        var time = new Date().getTime();
        var m = 0;
        if (time - bar.y_0_time < 300) {
            m += (bar.y_0 * (300 - (time - bar.y_0_time)));
        }
        if (time - bar.y_1_time < 300) {
            m += (bar.y_1 * (300 - (time - bar.y_1_time)));
        }
        if (time - bar.y_2_time < 300) {
            m += (bar.y_2 * (300 - (time - bar.y_2_time)));
        }
        if (time - bar.y_3_time < 300) {
            m += (bar.y_3 * (300 - (time - bar.y_3_time)));
        }

        return -m / 100;
    }
    bar.clearMomentumY = function() {
        bar.y_0    = 0
        bar.y_1    = 0
        bar.y_2    = 0
        bar.y_3    = 0
    }

    bar.getMomentumX = function() {
        return bar.dx;
    }
    bar.calculateMomentumX = function() {
        var time = new Date().getTime();
        var m = 0;
        if (time - bar.x_0_time < 300) {
            m += (bar.x_0 * (300 - (time - bar.x_0_time)));
        }
        if (time - bar.x_1_time < 300) {
            m += (bar.x_1 * (300 - (time - bar.x_1_time)));
        }
        if (time - bar.x_2_time < 300) {
            m += (bar.x_2 * (300 - (time - bar.x_2_time)));
        }
        if (time - bar.x_3_time < 300) {
            m += (bar.x_3 * (300 - (time - bar.x_3_time)));
        }

        return -m / 100;
    }
    bar.clearMomentumX = function() {
        bar.x_0    = 0
        bar.x_1    = 0
        bar.x_2    = 0
        bar.x_3    = 0
    }

    bar.setBarPos = function(diff) {
        bar.currentOffsetY = diff;
        bar.setY();
    }
    barLayer.add(bar.image);
    barLayer.add(bar.handleImage);

    bar.collisionWithBall = function(ball) {
        ball.image.fill('yellow');
        if (ball.x < (bar.playerX - (playerWidth/2) - ballRadius)) { return false; }
        if (ball.x > (bar.playerX + (playerWidth/2) + ballRadius)) { return false; }

        var collision = false;
        bar.players.forEach( function(player) {
            if (! player.grounded) { return false; }
            // same as above but for playerY
            if (ball.y < player.y - (playerHeight / 2) - ballRadius) { return false; }
            if (ball.y > player.y + (playerHeight / 2) + ballRadius) { return false; }

            // is the center of the ball within the box? i.e. is it hitting a flat surface
            var ballLeftOfPlayer   = (ball.x < player.x - (playerWidth/2));
            var ballRightOfPlayer  = (ball.x > player.x + (playerWidth/2));
            var ballTopOfPlayer    = (ball.y < player.y - (playerHeight/2));
            var ballBottomOfPlayer = (ball.y > player.y + (playerHeight/2));

            var dampen = 1;
            var angleBetween = Math.atan2(ball.x - (player.x + playerWidth / 2), ball.y - (player.y + playerHeight / 2));

            /// There are nine scenarios
            //      1 | 2 | 3
            //      4 | 9 | 5
            //      6 | 7 | 8
            if (            ballTopOfPlayer && 
                  ballLeftOfPlayer && ! ballRightOfPlayer &&
                          ! ballBottomOfPlayer
            ) { // scenario 1 top left
                debugText.text('top left');
                var sinFactor = Math.sin(angleBetween);
                var cosFactor = Math.cos(angleBetween);

                //*************** reflect the ball
                if (ball.dy > 0) { 
                    ball.dy = cosFactor * (-ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                } else {
                    ball.dy = cosFactor * ( ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                }
                if (ball.dx > 0) { 
                    ball.dx = sinFactor * ( ball.dx * dampen * playerDampen) + cosFactor * (-ball.dy * dampen * playerDampen);
                } else {
                    ball.dx = sinFactor * (-ball.dx * dampen * playerDampen) + cosFactor * (-ball.dy * dampen * playerDampen);
                }

                //************* move ball to the edge so they don't overlap 
                if (ball.x > player.x - (playerWidth/2) - ballRadius) {
                    ball.x = player.x - (playerWidth/2) - ballRadius;
                }
                if (ball.y > player.y - (playerHeight/2) - ballRadius) {
                    ball.y = player.y - (playerHeight/2) - ballRadius;
                }

                //************* apply momentum
                var dx = -((bar.getMomentumX() * sinFactor) + (bar.getMomentumY() * cosFactor));
                var dy = -((bar.getMomentumX() * cosFactor) + (bar.getMomentumY() * sinFactor));
                if (dx < 0) {
                    ball.dx += dx;
                } else if (dx > 0 && ball.dx > 0) {
                    ball.dx *= catchDampen;
                }
                if (dy < 0) {
                    ball.dy += dy;
                } else if (dy > 0 && ball.dy > 0) {
                    ball.dy *= catchDampen;
                }

                bar.clearMomentumX();
                bar.clearMomentumY();
            } else if (
                            ballTopOfPlayer &&
                ! ballLeftOfPlayer && ! ballRightOfPlayer &&
                          ! ballBottomOfPlayer
            ) { // scenario 2 top
                // average the angle with PI, which is for some reason the angle we expect? everything is rotated lol
                var sinFactor = Math.sin((PI + angleBetween) / 2);
                var cosFactor = Math.cos((PI + angleBetween) / 2);

                debugText.text('top');
                //*************** reflect the ball
                if (ball.dy > 0) { 
                    ball.dy = Math.abs(cosFactor) * (-ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                } else {
                    ball.dy = Math.abs(cosFactor) * (ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                }
                ball.dx = (Math.abs(cosFactor) * ball.dx) + (sinFactor * (-ball.dy * dampen * playerDampen));

                //************* move ball to the edge so they don't overlap 
                if (ball.y > player.y - (playerHeight/2) - ballRadius) {
                    ball.y = player.y - (playerHeight/2) - ballRadius;
                }

                //************* apply momentum
                var dy = bar.getMomentumY();
                if (dy < 0) {
                    ball.dy += bar.getMomentumY();
                } else if (dy > 0 && ball.dy > 0) {
                    ball.dy *= catchDampen;
                }
                ball.dx += (bar.getMomentumX() * 0.5);
                bar.clearMomentumX();
                bar.clearMomentumY();
            } else if (
                            ballTopOfPlayer &&
                ! ballLeftOfPlayer &&   ballRightOfPlayer &&
                          ! ballBottomOfPlayer
            ) { // scenario 3 top right
                debugText.text('top right');
                var sinFactor = Math.sin(angleBetween);
                var cosFactor = Math.cos(angleBetween);

                //************ reflect the ball
                if (ball.dy > 0) { 
                    ball.dy = cosFactor * (-ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                } else {
                    ball.dy = cosFactor * ( ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                }
                if (ball.dx < 0) { 
                    ball.dx = (sinFactor) * (-ball.dx * dampen * playerDampen) + cosFactor * (ball.dy * dampen * playerDampen);
                } else {
                    ball.dx = (sinFactor) * ( ball.dx * dampen * playerDampen) + cosFactor * (ball.dy * dampen * playerDampen);
                }

                //************* move ball to the edge so they don't overlap 
                if (ball.x < player.x + (playerWidth/2) + ballRadius) {
                    ball.x = player.x + (playerWidth/2) + ballRadius;
                }
                if (ball.y > player.y - (playerHeight/2) - ballRadius) {
                    ball.y = player.y - (playerHeight/2) - ballRadius;
                }

                //************* apply momentum
                var dx = ((bar.getMomentumX() * sinFactor) + (bar.getMomentumY() * cosFactor));
                var dy = ((bar.getMomentumX() * cosFactor) + (bar.getMomentumY() * sinFactor));
                if (dx > 0) {
                    ball.dx += dx;
                } else if (dx < 0 && ball.dx < 0) {
                    ball.dx *= catchDampen;
                }
                if (dy < 0) {
                    ball.dy += dy;
                } else if (dy > 0 && ball.dy > 0) {
                    ball.dy *= catchDampen;
                }

                if (dx != 0) {
                    var str = "dx: " + dx + ", dy: " + dy;
                    debugText2.text(str);
                }

                bar.clearMomentumX();
                bar.clearMomentumY();
            } else if (
                          ! ballTopOfPlayer &&
                  ballLeftOfPlayer && ! ballRightOfPlayer &&
                          ! ballBottomOfPlayer
            ) { // scenario 4 left
                debugText.text('left');
                //************ if we are leaning back dampen the ball extra
                if (ball.dx > 0) { 
                    var backAngle = Math.sin(player.angle);
                    if (backAngle > 0) {
                        dampen  = (1 - Math.abs(backAngle)); 
                    }
                }

                //************ reflect the ball
                // average the angle with 3*PI/2, which is for some reason the angle we expect? everything is rotated lol
                var sinFactor = Math.sin((3*PI/2 + angleBetween) / 2);
                var cosFactor = Math.cos((3*PI/2 + angleBetween) / 2);

                if (ball.dx > 0) { 
                    ball.dx = Math.abs(sinFactor) * (-ball.dx * dampen * playerDampen) + cosFactor * (ball.dy * dampen * playerDampen);
                } else {
                    ball.dx = Math.abs(sinFactor) * ( ball.dx * dampen * playerDampen) + cosFactor * (ball.dy * dampen * playerDampen);
                }
                ball.dy = (Math.abs(sinFactor) * ball.dy) + (cosFactor * (ball.dx * dampen * playerDampen));

                
                //************* move ball to the edge so they don't overlap 
                if (ball.x > player.x - (playerWidth/2) - ballRadius) {
                    ball.x = player.x - (playerWidth/2) - ballRadius;
                }

                console.log("dx: " + bar.getMomentumX());
                console.log("dy: " + bar.getMomentumY());
                console.log("dx-real: " + bar.dx);
                console.log("dy-real: " + bar.dy);

                //************* apply momentum
                var dx = bar.getMomentumX();
                if (dx < 0) {
                    ball.dx += bar.getMomentumX();
                } else if (dx > 0 && ball.dx > 0) {
                    ball.dx *= catchDampen;
                }
                ball.dy += (bar.getMomentumY() * 0.5);
                bar.clearMomentumX();
                bar.clearMomentumY();
            } else if (
                          ! ballTopOfPlayer &&
                ! ballLeftOfPlayer &&   ballRightOfPlayer &&
                          ! ballBottomOfPlayer
            ) { // scenario 5 right
                //************ if we are leaning back dampen the ball extra
                debugText.text('right');
                if (ball.dx < 0) { 
                    var backAngle = Math.sin(player.angle);
                    if (backAngle < 0) {
                        dampen  = (1 - Math.abs(backAngle)); 
                    }
                }

                //************ reflect the ball
                // average the angle with PI/2, which is for some reason the angle we expect? everything is rotated lol
                var sinFactor = Math.sin((PI/2 + angleBetween) / 2);
                var cosFactor = Math.cos((PI/2 + angleBetween) / 2);

                if (ball.dx < 0) { 
                    ball.dx = Math.abs(sinFactor) * (-ball.dx * dampen * playerDampen) + cosFactor * (ball.dy * dampen * playerDampen);
                } else {
                    ball.dx = Math.abs(sinFactor) * ( ball.dx * dampen * playerDampen) + cosFactor * (ball.dy * dampen * playerDampen);
                }
                ball.dy = (Math.abs(sinFactor) * ball.dy) + (cosFactor * (ball.dx * dampen * playerDampen));
                
                //************* move ball to the edge so they don't overlap 
                if (ball.x < player.x + (playerWidth/2) + ballRadius) {
                    ball.x = player.x + (playerWidth/2) + ballRadius;
                }

                //************* apply momentum
                var dx = bar.getMomentumX();
                if (dx > 0) {
                    ball.dx += bar.getMomentumX();
                } else if (dx < 0 && ball.dx < 0) {
                    ball.dx *= catchDampen;
                }
                ball.dy += (bar.getMomentumY() * 0.5);
                bar.clearMomentumX();
                bar.clearMomentumY();
            } else if (
                          ! ballTopOfPlayer &&
                  ballLeftOfPlayer && ! ballRightOfPlayer &&
                            ballBottomOfPlayer
            ) { // scenario 6 - bottom left
                debugText.text('bottom left');
                var sinFactor = Math.sin(angleBetween);
                var cosFactor = Math.cos(angleBetween);

                //************ reflect the ball
                if (ball.dy < 0) { 
                    ball.dy = cosFactor * (-ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                } else {
                    ball.dy = cosFactor * ( ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                }
                if (ball.dx > 0) { 
                    ball.dx = sinFactor * ( ball.dx * dampen * playerDampen) + cosFactor * (-ball.dy * dampen * playerDampen);
                } else {
                    ball.dx = sinFactor * (-ball.dx * dampen * playerDampen) + cosFactor * (-ball.dy * dampen * playerDampen);
                }

                //************* move ball to the edge so they don't overlap 
                if (ball.x > player.x - (playerWidth/2) - ballRadius) {
                    ball.x = player.x - (playerWidth/2) - ballRadius;
                }
                if (ball.y < player.y + (playerHeight/2) + ballRadius) {
                    ball.y = player.y + (playerHeight/2) + ballRadius;
                }

                //************* apply momentum
                var dx = -((bar.getMomentumX() * sinFactor) + (bar.getMomentumY() * cosFactor));
                var dy =  ((bar.getMomentumX() * cosFactor) + (bar.getMomentumY() * sinFactor));
                if (dx < 0) {
                    ball.dx += dx;
                } else if (dx > 0 && ball.dx > 0) {
                    ball.dx *= catchDampen;
                }
                if (dy > 0) {
                    ball.dy += dy;
                } else if (dy < 0 && ball.dy < 0) {
                    ball.dy *= catchDampen;
                }

                bar.clearMomentumX();
                bar.clearMomentumY();
            } else if (
                          ! ballTopOfPlayer &&
                ! ballLeftOfPlayer && ! ballRightOfPlayer &&
                            ballBottomOfPlayer
            ) { // scenario 7 - bottom
                debugText.text('bottom');
                // average the angle with 0, which is for some reason the angle we expect? everything is rotated lol
                var sinFactor = Math.sin((0 + angleBetween) / 2);
                var cosFactor = Math.cos((0 + angleBetween) / 2);

                //************ reflect the ball
                if (ball.dy < 0) { 
                    ball.dy = Math.abs(cosFactor) * (-ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                } else {
                    ball.dy = Math.abs(cosFactor) * (ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                }
                ball.dx = (Math.abs(cosFactor) * ball.dx) + (sinFactor * (ball.dy * dampen * playerDampen));
                
                //************* move ball to the edge so they don't overlap 
                if (ball.y < player.y + (playerHeight/2) + ballRadius) {
                    ball.y = player.y + (playerHeight/2) + ballRadius;
                }

                //************* apply momentum
                var dy = bar.getMomentumY();
                if (dy > 0) {
                    ball.dy += bar.getMomentumY();
                } else if (dy < 0 && ball.dy < 0) {
                    ball.dy *= catchDampen;
                }
                ball.dx += (bar.getMomentumX() * 0.5);

                bar.clearMomentumX();
                bar.clearMomentumY();
            } else if (
                          ! ballTopOfPlayer &&
                ! ballLeftOfPlayer &&   ballRightOfPlayer &&
                            ballBottomOfPlayer
            ) { // scenario 8 - bottom right
                debugText.text('bottom right');
                var sinFactor = Math.sin(angleBetween);
                var cosFactor = Math.cos(angleBetween);

                //************ reflect the ball
                if (ball.dy < 0) { 
                    ball.dy = (cosFactor) * (-ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                } else {
                    ball.dy = (cosFactor) * (ball.dy * dampen * playerDampen) + (sinFactor * (ball.dx * dampen * playerDampen));
                }
                if (ball.dx < 0) { 
                    ball.dx = (sinFactor) * (-ball.dx * dampen * playerDampen) + cosFactor * (ball.dy * dampen * playerDampen);
                } else {
                    ball.dx = (sinFactor) * ( ball.dx * dampen * playerDampen) + cosFactor * (ball.dy * dampen * playerDampen);
                }
                
                //************* move ball to the edge so they don't overlap 
                if (ball.x < player.x + (playerWidth/2) + ballRadius) {
                    ball.x = player.x + (playerWidth/2) + ballRadius;
                }
                if (ball.y < player.y + (playerHeight/2) + ballRadius) {
                    ball.y = player.y + (playerHeight/2) + ballRadius;
                }

                //************* apply momentum
                var dx = -((bar.getMomentumX() * sinFactor) + (bar.getMomentumY() * cosFactor));
                var dy =  ((bar.getMomentumX() * cosFactor) + (bar.getMomentumY() * sinFactor));
                if (ball.dx < 0) { 
                    ball.dx = dx;
                } else {
                    ball.dx = dy;
                }
                if (dy > 0) {
                    ball.dy += bar.getMomentumY();
                } else if (dy < 0 && ball.dy < 0) {
                    ball.dy *= catchDampen;
                }

                bar.clearMomentumX();
                bar.clearMomentumY();
            } else if (
                          ! ballTopOfPlayer &&
                ! ballLeftOfPlayer && ! ballRightOfPlayer &&
                          ! ballBottomOfPlayer
            ) { // scenario 9 - trapped
                debugText.text('pinned');
                ball.image.fill('black');
            } else {
                debugText.text('none!');
                // ???????
            }
            playerAboveLayer.draw();
            return true;
        });
        return true
    };

    return bar;
};

var ballFactory = function(x, y) {
    var ball = {};
    ball.image = new Konva.Circle({
        x: 0, // set by object that contains ball
        y: 0, // set by object that contains ball
        radius: ballRadius,
        fill: 'yellow',
        stroke: 'black',
        strokeWidth: 1,
        shadowColor: 'black',
        shadowBlur: 1,
        shadowOffset: { x: 0, y: 0 },
        draggable: host,
        shadowOpacity: 0.3
    });
    ball.x = 0;
    ball.y = 0;
    ball.dx = 0;
    ball.dy = 0;
    ball.lastFrame = null;
    ball.setX = function(x) {
        ball.x = x;
        ball.image.setX(offsetX + ball.x) 
    };
    ball.setY = function(y) {
        ball.y = y;
        ball.image.setY(offsetY + ball.y)
    };
    // sends a msg also
    ball.setXY = function(x, y) {
        if (Math.round(x) !== Math.round(ball.x) || Math.round(y) != Math.round(ball.y)) {
            var ball_msg = {
                "c" : "ball",
                "x" : ball.x,
                "y" : ball.y
            };
            sendMsg(ball_msg);
        }
        ball.setX(x);
        ball.setY(y);
        ballLayer.draw();
    };
    ball.setX(100);
    ball.setY(100);

    ball.lastDampen = 0;
    ballLayer.add(ball.image);

    ball.anim = new Konva.Animation(function(frame) {
        if (ball.lastFrame === null){ ball.lastFrame = frame.time};
        var frameTime = ((frame.time - ball.lastFrame) / 1000);

        ball.setXY(ball.x + (ball.dx * frameTime), ball.y + (ball.dy * frameTime));

        ball.dx = ball.dx * (1 - (frameTime * friction));
        ball.dy = ball.dy * (1 - (frameTime * friction));

        ball.lastFrame = frame.time;

        var wallCollision = false;
        if (ball.x + ballRadius > width || ball.x - ballRadius < 0){
            if ((ball.y > (height / 2 - goalWidth / 2)) && (ball.y < (height / 2 + goalWidth / 2))) {
                if (ball.x + ballRadius > width) {
                    redScore += 1;
                    if (redScore == 5) {
                        redScore = 0;
                        blueScore = 0;
                    }
                } else {
                    blueScore += 1;
                    if (blueScore == 5) {
                        redScore = 0;
                        blueScore = 0;
                    }
                }
                var ball_msg = {
                    "c" : "score",
                    "red"  : redScore,
                    "blue" : blueScore
                };
                sendMsg(ball_msg);

                ball.x = width  / 2;
                ball.y = height / 2;
                ball.dx = 0;
                ball.dy = 0;
                var ball_msg = {
                    "c" : "ball",
                    "x" : ball.x,
                    "y" : ball.y
                };
                sendMsg(ball_msg);

                return false;
            }
            wallCollision = true;
            if (ball.x + ballRadius > width) {
                ball.x = width - ballRadius - 1;
            } else {
                ball.x = 0 + ballRadius + 1;
            }
            ball.dx = -ball.dx;
        } 
        if (ball.y + ballRadius > height || ball.y - ballRadius < 0){
            wallCollision = true;
            if (ball.y + ballRadius > height) {
                ball.y = height - ballRadius - 1;
            } else {
                ball.y = 0 + ballRadius + 1;
            }
            ball.dy = -ball.dy;
        } 
        if (wallCollision) {
            ball.dx *= wallDampen;
            ball.dy *= wallDampen;
        }

        if (bar1.collisionWithBall(ball) ||
            bar2.collisionWithBall(ball) ||
            bar3.collisionWithBall(ball) ||
            bar4.collisionWithBall(ball) ||
            bar5.collisionWithBall(ball) ||
            bar6.collisionWithBall(ball) ||
            bar7.collisionWithBall(ball) ||
            bar8.collisionWithBall(ball) ) {
            // just to prevent them from running if they match one
        }

    }, ballLayer);

    if (host) {
        ball.anim.start();
    }

    ball.image.on('mousedown', function() {
        ball.anim.stop();
        ball.image.fill('orange');
    });
    ball.image.on('dragend', function() {
        var pos = stage.getPointerPosition();
        ball.x = pos.x - offsetX;
        ball.y = pos.y - offsetY;
        ball.dx = 0;
        ball.dy = 0;
        if (host) {
            ball.anim.start();
        }
        ball.image.fill('yellow');
        var ball_msg = {
            "c" : "ball",
            "x" : ball.x,
            "y" : ball.y
        };
        sendMsg(ball_msg);
    });

    return ball;
};

$(function () {
    //////////////////////////////////

    console.log("connecting...");
    var bindGameEvents = function(ws_conn) {
        conn.onopen = function(evt) {
            // finished connecting.
            // maybe query for ready to join
            console.log("connected!");
            connected = true;
            pingServer = setInterval(function() {
                var d = new Date();
                var timestamp = d.getTime();
                heartbeat_msg = {
                    "c" : "ping",
                };
                sendMsg(heartbeat_msg);
            }, 3000); 
        };

        conn.onerror = function(e) {
            console.log('Error!');
        };

        conn.onclose = function(e) {
            console.log('Disconnected!');
            game_reconnectInterval = setTimeout(
                game_reconnectMain,
                1000
            );
        };
    };
    var conn = new WebSocket("ws://" + wsDomain + ":3000/ws");
    bindGameEvents(conn);

    var game_reconnectInterval;
    var game_reconnectMain = function() {
        if (isConnected == false) {
            $("#connectionStatus").html("Reconnecting...");
            conn = null;
            conn = new WebSocket("ws://" + wsDomain + ":3000/ws");
            bindGameEvents(main_conn);
        } else {
            reconnectInterval = null;
        }
    }

    sendMsg = function(msg) {
        if (! connected ) { return false; }
        if (msg.c != 'pong') {
            //console.log(msg);
        }
        conn.send(JSON.stringify(msg));
    };

    var handleMessage = function(msg) {
        if (msg.c == 'move'){ 

        } else if (msg.c == 'bar'){
            var bar = barsById[msg.id];
            bar.dx = msg.dx;
            bar.dy = msg.dy;
            if (currentGrippedBar === null || currentGrippedBar.id != msg.id) {
                //if (bar) {
                    console.log(msg);
                    bar.setAngle(msg.angle);
                    bar.currentOffsetY = msg.y;
                    bar.setY();
                    bar.players.forEach(function(player) {
                        player.setY(bar.currentOffsetY);
                    });
                    playerLayer.draw();
                    barLayer.draw();
                    playerAboveLayer.draw();
                //}
            }
        } else if (msg.c == 'score'){
            redScoreText.text("Score: " + msg.red);
            blueScoreText.text("Score: " + msg.blue);
        } else if (msg.c == 'ball'){
            if (host)         { return false; }
            if (ball == null) { return false; }
            ball.setX(msg.x);
            ball.setY(msg.y);
            ballLayer.draw();
        } else if (msg.c == 'spawn'){
        } else if (msg.c == 'pong'){
        } else {
            //console.log("unknown msg recieved");
            //console.debug(msg);
        }

    }

    conn.onmessage = function(evt) {

        var msg = JSON.parse(evt.data);
        if (msg.c != 'pong') {
            //console.log("msg: " + evt.data);
        }
        handleMessage(msg);
    };






    //////////////////////////////////

    var field = new Konva.Rect({
        x: offsetX + 0,
        y: offsetY + 0,
        width: width,
        height: height,
        fill: 'green',
        stroke: 'black',
        strokeWidth: 3
    });
    var midCircle = new Konva.Circle({
        x: offsetX + width/2,
        y: offsetY + height/2,
        radius: width / 6,
        stroke: 'white',
        strokeWidth: 3
    });
    var midLine = new Konva.Line({
        points: [ offsetX + width/2, offsetY + 0     , 
                  offsetX + width/2, offsetY + height
                ],
        stroke: 'white',
        strokeWidth: 3
    });
    var goalBox1 = new Konva.Line({
        points: [ offsetX + 0                , offsetY + ((height / 2) - (goalWidth / 1)) ,
                  offsetX + goalWidth * 0.80 , offsetY + ((height / 2) - (goalWidth / 1)),
                  offsetX + goalWidth * 0.80 , offsetY + ((height / 2) + (goalWidth / 1)),
                  offsetX + 0                , offsetY + ((height / 2) + (goalWidth / 1)),
                ],
        stroke: 'white',
        strokeWidth: 3
    });
    var goalBoxInner1 = new Konva.Line({
        points: [ offsetX + 0                , offsetY + ((height / 2) - (goalWidth / 2)) ,
                  offsetX + goalWidth * 0.66 , offsetY + ((height / 2) - (goalWidth / 2)),
                  offsetX + goalWidth * 0.66 , offsetY + ((height / 2) + (goalWidth / 2)),
                  offsetX + 0                , offsetY + ((height / 2) + (goalWidth / 2)),
                ],
        stroke: 'white',
        strokeWidth: 3
    });
    var goalBoxArch1 = new Konva.Arc({
        x: offsetX + (goalWidth * 0.66) - 8,
        y: offsetY + (height / 2),
        innerRadius: 50,
        outerRadius: 50,
        angle: 120,
        rotation: -60,
        stroke: 'white',
        strokeWidth: 3
    });
    var goalBoxArch2 = new Konva.Arc({
        x: offsetX + width - (goalWidth * 0.66) + 8,
        y: offsetY + (height / 2),
        innerRadius: 50,
        outerRadius: 50,
        angle: 120,
        rotation: -60,
        stroke: 'white',
        strokeWidth: 3
    });
    var goalBox2 = new Konva.Line({
        points: [ offsetX + width                      , offsetY + ((height / 2) - (goalWidth / 1)) ,
                  offsetX + (width - goalWidth * 0.80) , offsetY + ((height / 2) - (goalWidth / 1)),
                  offsetX + (width - goalWidth * 0.80) , offsetY + ((height / 2) + (goalWidth / 1)),
                  offsetX + width                      , offsetY + ((height / 2) + (goalWidth / 1)),
                ],
        stroke: 'white',
        strokeWidth: 3
    });
    var goalBoxInner2 = new Konva.Line({
        points: [ offsetX + width                      , offsetY + ((height / 2) - (goalWidth / 2)) ,
                  offsetX + (width - goalWidth * 0.66) , offsetY + ((height / 2) - (goalWidth / 2)),
                  offsetX + (width - goalWidth * 0.66) , offsetY + ((height / 2) + (goalWidth / 2)),
                  offsetX + width                      , offsetY + ((height / 2) + (goalWidth / 2)),
                ],
        stroke: 'white',
        strokeWidth: 3
    });
    var goalLeft = new Konva.Rect({
        x: offsetX - 10,
        y: offsetY + (height / 2) - (goalWidth / 2),
        width: goalWidth / 5,
        height: goalWidth,
        fill: 'black',
    });
    var goalRight = new Konva.Rect({
        x: offsetX + width - 10,
        y: offsetY + (height / 2) - (goalWidth / 2),
        width: goalWidth / 5,
        height: goalWidth,
        fill: 'black',
    });

    fieldLayer.add(field);
    fieldLayer.add(goalLeft);
    fieldLayer.add(goalRight);
    fieldLayer.add(midLine);
    fieldLayer.add(goalBox1);
    fieldLayer.add(goalBoxInner1);
    fieldLayer.add(goalBoxArch1);
    fieldLayer.add(goalBox2);
    fieldLayer.add(goalBoxInner2);
    fieldLayer.add(goalBoxArch2);
    fieldLayer.add(midCircle);

    var redGoaliePlayer = playerFactory(barOffset1, goalOffset, 'red', 'darkred');
    var redDef1Player   = playerFactory(barOffset2, def1Offset, 'red', 'darkred');
    var redDef2Player   = playerFactory(barOffset2, def2Offset, 'red', 'darkred');
    var redMid1Player   = playerFactory(barOffset4, mid1Offset, 'red', 'darkred');
    var redMid2Player   = playerFactory(barOffset4, mid2Offset, 'red', 'darkred');
    var redMid3Player   = playerFactory(barOffset4, mid3Offset, 'red', 'darkred');
    var redMid4Player   = playerFactory(barOffset4, mid4Offset, 'red', 'darkred');
    var redMid5Player   = playerFactory(barOffset4, mid5Offset, 'red', 'darkred');
    var redFor1Player   = playerFactory(barOffset6, for1Offset, 'red', 'darkred');
    var redFor2Player   = playerFactory(barOffset6, for2Offset, 'red', 'darkred');
    var redFor3Player   = playerFactory(barOffset6, for3Offset, 'red', 'darkred');

    var blueGoaliePlayer = playerFactory(barOffset8, goalOffset, 'blue', 'darkblue');
    var blueDef1Player   = playerFactory(barOffset7, def1Offset, 'blue', 'darkblue');
    var blueDef2Player   = playerFactory(barOffset7, def2Offset, 'blue', 'darkblue');
    var blueMid1Player   = playerFactory(barOffset5, mid1Offset, 'blue', 'darkblue');
    var blueMid2Player   = playerFactory(barOffset5, mid2Offset, 'blue', 'darkblue');
    var blueMid3Player   = playerFactory(barOffset5, mid3Offset, 'blue', 'darkblue');
    var blueMid4Player   = playerFactory(barOffset5, mid4Offset, 'blue', 'darkblue');
    var blueMid5Player   = playerFactory(barOffset5, mid5Offset, 'blue', 'darkblue');
    var blueFor1Player   = playerFactory(barOffset3, for1Offset, 'blue', 'darkblue');
    var blueFor2Player   = playerFactory(barOffset3, for2Offset, 'blue', 'darkblue');
    var blueFor3Player   = playerFactory(barOffset3, for3Offset, 'blue', 'darkblue');


    bar1 = barFactory('1', barOffset1, (barRoom / 2),  "bottom",[ redGoaliePlayer ] );
    bar2 = barFactory('2', barOffset2, (barRoom / 2.5),"bottom",[ redDef1Player, redDef2Player ] );
    bar3 = barFactory('3', barOffset3, (barRoom / 3),  'top'   ,[ blueFor1Player, blueFor2Player, blueFor3Player ] );
    bar4 = barFactory('4', barOffset4, (barRoom / 10), 'bottom',[ redMid1Player, redMid2Player, redMid3Player, redMid4Player, redMid5Player ]);
    bar5 = barFactory('5', barOffset5, (barRoom / 10), 'top',   [ blueMid1Player, blueMid2Player, blueMid3Player, blueMid4Player, blueMid5Player ] );
    bar6 = barFactory('6', barOffset6, (barRoom / 3),  'bottom',[ redFor1Player, redFor2Player, redFor3Player ]);
    bar7 = barFactory('7', barOffset7, (barRoom / 2.5),'top',   [ blueDef1Player, blueDef2Player ] );
    bar8 = barFactory('8', barOffset8, (barRoom / 2),  'top',   [ blueGoaliePlayer ] );

    barsById = {
        '1':bar1,
        '2':bar2,
        '3':bar3,
        '4':bar4,
        '5':bar5,
        '6':bar6,
        '7':bar7,
        '8':bar8,
    };

    var ball = ballFactory(width / 2, height / 2);

    // *********************** setup the board
    var setupBoard = function(){
        var stage = new Konva.Stage({
            container: 'container',
            width: width * 2,
            height: height * 3
        });
        playerAboveLayer.add(debugText);
        playerAboveLayer.add(debugText2);

        playerAboveLayer.add(redScoreText);
        playerAboveLayer.add(blueScoreText);

        ballLayer.draw();
        stage.add(fieldLayer);
        stage.add(playerLayer);
        stage.add(ballLayer);
        stage.add(barLayer);
        stage.add(playerAboveLayer);

        return stage;
    } 

    stage = setupBoard();

    stage.on('mousemove', function() {
        if (currentGrippedBar !== null) {
            var mousePos = stage.getPointerPosition();
            currentGrippedBar.moveXY(mousePos.x - currentGrippedBar.grippedX, mousePos.y - currentGrippedBar.grippedY);
            playerLayer.draw();
            barLayer.draw();
            playerAboveLayer.draw();
        }
    });

    const DELTA_X = 20;
    const DELTA_Y = 5;

    var container = stage.container();
    container.tabIndex = 1;
    container.focus();
    container.addEventListener('keydown', function(e) {
        if (currentKeyBar !== null) {
            console.log(e);
            if (e.keyCode === 37) {
                currentKeyBar.keyX -= DELTA_X;
            } else if (e.keyCode === 38) {
                currentKeyBar.keyY -= DELTA_Y;
            } else if (e.keyCode === 39) {
                currentKeyBar.keyX += DELTA_X;
            } else if (e.keyCode === 40) {
                currentKeyBar.keyY += DELTA_Y;
            } else {
                return;
            }
            currentKeyBar.moveXY(currentKeyBar.keyX, currentKeyBar.keyY);
        }
        e.preventDefault();
    });
    
    stage.on('mouseup', function() {
        currentGrippedBar = null;
    });
});
