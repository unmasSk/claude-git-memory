"""Tests for Next cleanup: issue matching logic."""
import re


def _keywords(text):
    stop = {"the", "and", "for", "from", "with", "that", "this", "not", "are", "was"}
    return {w.lower() for w in re.findall(r"[a-zA-Z]{3,}", text) if w.lower() not in stop}


def test_keyword_overlap_positive():
    next_kw = _keywords("implement rate limiting for api")
    title_kw = _keywords("implement rate limiting")
    assert len(next_kw & title_kw) >= 2


def test_keyword_overlap_negative():
    next_kw = _keywords("fix upstream auth bug")
    title_kw = _keywords("add logging to payment service")
    assert len(next_kw & title_kw) < 2


def test_keyword_overlap_partial():
    next_kw = _keywords("refactor auth middleware")
    title_kw = _keywords("auth service cleanup")
    assert len(next_kw & title_kw) >= 1  # "auth" matches but only 1 keyword


def test_issue_ref_extraction():
    text = "implement rate limiting #42"
    match = re.search(r"#(\d+)", text)
    assert match is not None
    assert match.group(1) == "42"


def test_no_issue_ref():
    text = "implement rate limiting"
    match = re.search(r"#(\d+)", text)
    assert match is None
