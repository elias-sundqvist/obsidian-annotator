import hypothesisResources from './resources!zipStringEncoded';
import * as jszip from 'jszip';

export default jszip.loadAsync(hypothesisResources);
