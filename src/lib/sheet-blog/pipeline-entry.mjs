import {mountQueueProgress} from './progress-browser.mjs';
import {queueClient} from './progress.mjs';
mountQueueProgress(document.querySelector('[data-queue-progress]'),{client:queueClient(fetch,{strictHead:true}),showEvidence:true});
