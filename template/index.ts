console.log("Try npm run lint/fix!");

const longString = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer ut aliquet diam.';

const trailing = 'Semicolon'

			const why = 'am I tabbed?';

const iWish = "I didn't have a trailing space..."; 

export function doSomeStuff(withThis: string, andThat: string, andThose: string[]) {
    //function on one line
    if(!andThose.length) {return false;}
    console.log(withThis);
    console.log(andThat);
    console.dir(andThose);
    console.log(longString, trailing, why, iWish);
    return;
}
// TODO: more examples
