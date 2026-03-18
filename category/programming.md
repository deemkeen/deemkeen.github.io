---
layout: page
title: programming
permalink: /category/programming/
---

<ul>
{% for post in site.categories.programming %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </li>
{% endfor %}
</ul>
