<?php
/**
 * @noinspection PhpMultipleClassDeclarationsInspection
 */

namespace SV\DynamicThreadDescription\XF\Entity;

/**
 * Extends \XF\Entity\Post
 */
class Post extends XFCP_Post
{
    public function getLinkToThreadmarkReaderMode(array $extra = [])
    {
        $extra['post'] = $this->post_id;

        return parent::getLinkToThreadmarkReaderMode($extra);
    }

    public function getRedirectLinkForThreadmark($canonical = false, $footer = false)
    {
        $thread = $this->Thread;

        if (!$canonical && $thread)
        {
            $page = \floor($this->position / \XF::options()->messagesPerPage) + 1;

            return $this->app()->router()->buildLink('threads', $thread, ['page' => $page, 'post' => $this->post_id]) . '#post-' . ($footer ? 'footer-' : '') . $this->post_id;
        }

        return parent::getRedirectLinkForThreadmark($canonical, $footer);
    }
}