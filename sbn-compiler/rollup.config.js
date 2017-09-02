import commonjs from 'rollup-plugin-commonjs';
import resolver from 'rollup-plugin-node-resolve';

export default {
    entry: 'src/compiler.js',
    dest: 'sbn.js',
    format: 'umd',
    moduleName: 'sbn',
    external: ['ramda', 'ramda-fantasy'],
    globals: {
        ramda: 'R',
        'ramda-fantasy': 'ramdaFantasy'
    },
    plugins: [
        resolver(),
        commonjs({
            include: './node_modules/**'
        })
    ]
};
