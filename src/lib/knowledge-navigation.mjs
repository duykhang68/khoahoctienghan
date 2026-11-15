import order from '../data/knowledge-navigation.json' with { type: 'json' };
import {orderedTopics as orderTopics} from '../../core/editorial/content-index.mjs';
export function orderedTopics(topics,sequence=order){return orderTopics(topics,sequence);}
