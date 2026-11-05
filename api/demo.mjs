import {handleDemoRequest} from '../server/demo/service.mjs';
export default {fetch(request){return handleDemoRequest(request);}};
