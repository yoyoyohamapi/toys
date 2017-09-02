import R from 'ramda';
import { trace } from './internal';
import { Either } from 'ramda-fantasy'

const createAttrString = R.compose(
    R.join(' '),
    R.values,
    R.map(pair => `${pair[0]}="${pair[1]}"`),
    R.toPairs
);

/**
 * generate svg from svgAst
 * {k:v} -> {k:v}
 */
const traverseSvgAst = (obj) => {
    const attrText = createAttrString(obj.attr);
    const elements = R.map(node => traverseSvgAst(node), obj.body).join('\n\t');
    return `<${obj.tag} ${attrText}}>${elements}</${obj.tag}>`;
};

const generator =  R.compose(
    Either.Right,
    traverseSvgAst
);

export default generator;
