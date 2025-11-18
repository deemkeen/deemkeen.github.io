---
layout: page
title: fediverse
permalink: /category/fediverse/
---

<ul>
{% for post in site.categories.fediverse %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </li>
{% endfor %}
</ul>
