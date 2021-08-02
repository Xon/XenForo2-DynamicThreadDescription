<?php

namespace SV\DynamicThreadDescription\XF\Pub\Controller;

use XF\Mvc\Entity\AbstractCollection;
use XF\Mvc\ParameterBag;
use XF\Mvc\Reply\View as ViewReply;

/**
 * Extends \XF\Pub\Controller\Thread
 */
class Thread extends XFCP_Thread
{
    /**
     * @param ParameterBag $params
     * @return \XF\Mvc\Reply\AbstractReply
     */
    public function actionIndex(ParameterBag $params)
    {
        $reply = parent::actionIndex($params);

        if ($reply instanceof ViewReply)
        {
            /** @var \XF\Entity\Thread $thread */
            $thread = $reply->getParam('thread');
            /** @var AbstractCollection|array $posts */
            $posts = $reply->getParam('posts');
            $posts = \is_array($posts) ? $posts : ($posts->toArray() ?? []);

            if ($thread && \count($posts) !== 0)
            {
                $postId = $this->filter('post', 'uint');
                if ($postId)
                {
                    $post = $posts[$postId] ?? null;
                    $reply->setParam('dynamicRefererPost', $post);
                }
            }
        }

        return $reply;
    }
}