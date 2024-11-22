
// ==UserScript==
// @name         Surviv.IO Aimbot, ESP & X-Ray
// @namespace    https://greasyfork.org
// @version      0.0.4
// @description  Aimbot and ESP for surviv.io. Locks the aim to the nearest player and shows lines between nearby players. Removes ceilings from buildings and let's you see inside them too.
// @author       Zertalious (Zert) && modified by waltertang27
// @match        *://survev.io/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

let espEnabled = true;
let aimbotEnabled = true;
let xrayEnabled = true;

Object.defineProperty( Object.prototype, 'textureCacheIds', {
	set( value ) {

		this._textureCacheIds = value;

		if ( Array.isArray( value ) ) {

			const scope = this;

			value.push = new Proxy( value.push, {
				apply( target, thisArgs, args ) {

					if ( args[ 0 ].indexOf( 'ceiling' ) > - 1 ) {

						Object.defineProperty( scope, 'valid', {
							set( value ) {

								this._valid = value;

							},
							get() {

								return xrayEnabled ? false : this._valid;

							}
						} );

					}

					return Reflect.apply( ...arguments );

				}
			} );

		}

	},
	get() {

		return this._textureCacheIds;

	}
} );


const params = {
	get() {

		console.log( 'getting ctx', this );

		return null;

	}
};

Object.defineProperty( window, 'WebGLRenderingContext', params );
Object.defineProperty( window, 'WebGL2RenderingContext', params );

let ctx;

HTMLCanvasElement.prototype.getContext = new Proxy( HTMLCanvasElement.prototype.getContext, {
	apply( target, thisArgs, args ) {

		const result = Reflect.apply( ...arguments );

		if ( thisArgs.parentNode ) {

			ctx = result;

		}

		return result;

	}
} );

const players = [];

let radius;

let mouseX = 0, mouseY = 0;

window.addEventListener( 'mousemove', function ( event ) {

	if ( event.dispatchedByMe !== true ) {

		mouseX = event.clientX;
		mouseY = event.clientY;

	}

} );

window.addEventListener( 'keyup', function ( event ) {

	switch ( String.fromCharCode( event.keyCode ) ) {

		case 'N' : espEnabled = ! espEnabled; break;
		case 'B' : aimbotEnabled = ! aimbotEnabled; break;
		case 'H' : xrayEnabled = ! xrayEnabled; break;

	}

} );


const Context2D = CanvasRenderingContext2D.prototype;


Context2D.drawImage = new Proxy(Context2D.drawImage, {
    apply(target, thisArgs, args) {
        if (aimbotEnabled || espEnabled) {
            const isPlayerImage =
                args[0] instanceof HTMLCanvasElement &&
                args.length === 9
                //&& args[8] >= 284 && args[8] <= 288;
            //70, 71, -140, -140, 280, 284
            && args[3] == 70
            && args[4] == 71
            && args[5] == -140
            && args[6] == -140
            && args[7] == 280
            && args[8] == 284;

            if (isPlayerImage) {
                console.log('important info:', args);
                const { a, b, e, f } = thisArgs.getTransform();
                console.log('coordinates', a,b,e,f);

                // Calculate the player's position on the canvas
                const playerX = e;
                const playerY = f;

                // Optionally, adjust for scaling
                const scale = Math.hypot(a, b);
                const playerRadius = scale * args[8] + 10;

                // Store or process the player's position
                const centerX = ctx.canvas.width / 2;
                const centerY = ctx.canvas.height / 2;
                if (centerX != playerX && centerY != playerY) {
                    players.push({ x: playerX, y: playerY });
                }

                // Debug output
                //console.log('Player detected at:', playerX, playerY);
            }
        }
        // Proceed with the original drawImage call
        return Reflect.apply(target, thisArgs, args);
    }
});



window.requestAnimationFrame = new Proxy( window.requestAnimationFrame, {
	apply( target, thisArgs, args ) {

		args[ 0 ] = new Proxy( args[ 0 ], {
			apply( target, thisArgs, args ) {

				players.length = 0;

				Reflect.apply( ...arguments );

				ctx.fillStyle = '#fff';

				const array = [
					[ '[B] Aimbot', aimbotEnabled ],
					[ '[N] ESP', espEnabled ],
					[ '[H] X-Ray', xrayEnabled ]
				];

				const fontSize = 20;

				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';

				ctx.font = 'bolder ' + fontSize + 'px monospace';

				for ( let i = 0; i < array.length; i ++ ) {

					const [ text, status ] = array[ i ];

					ctx.globalAlpha = status ? 1 : 0.5;

					ctx.fillText( text + ': ' + ( status ? 'ON' : 'OFF' ), ctx.canvas.width / 2, 10 + i * fontSize );

				}

				ctx.globalAlpha = 1;

				ctx.lineWidth = 5;
				ctx.strokeStyle = 'red';

				if ( espEnabled ) {

					const centerX = ctx.canvas.width / 2;
					const centerY = ctx.canvas.height / 2;

					ctx.beginPath();

					for ( let i = 0; i < players.length; i ++ ) {

						const player = players[ i ];
                        if (player.x == centerX && player.y == centerY) {
                            continue;
                        }

						ctx.moveTo( centerX, centerY );

						ctx.lineTo( player.x, player.y );

					}

					ctx.stroke();

				}

                if (aimbotEnabled && players.length > 0) {
                    let minDistance = Infinity;
                    let targetPlayer = null;
                    const centerX = ctx.canvas.width / 2;
                    const centerY = ctx.canvas.height / 2;
                    for (let i = 0; i < players.length; i++) {
                        const player = players[i];
                        const dx = player.x - centerX;
                        const dy = player.y - centerY;
                        const distance = Math.hypot(dx, dy);
                        if (distance < minDistance && distance > 0) {
                            minDistance = distance;
                            targetPlayer = player;
                        }
                    }
                    if (targetPlayer) {
                        const dx = targetPlayer.x - centerX;
                        const dy = targetPlayer.y - centerY;
                        console.log(`Targeting player at: X=${targetPlayer.x}, Y=${targetPlayer.y}, Distance=${minDistance}`);
                        window.dispatchEvent(
                            new MouseEvent('mousemove', {
                                clientX: mouseX + dx,
                                clientY: mouseY + dy,
                                dispatchedByMe: true,
                            })
                        );
                    }
                }

			}
		} );

		return Reflect.apply( ...arguments );

	}
} );