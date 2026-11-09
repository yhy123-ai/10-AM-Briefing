import json, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import briefing

class MailTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.local=patch.object(briefing,'LOCAL',Path(self.temp.name));self.local.start()
        article=json.loads((briefing.ROOT/'data/bootstrap.json').read_text(encoding='utf8'))[0]
        article['title']='<script>alert(1)</script>';article['summary']='引号 & <b>摘要</b>'
        self.edition={'date':'2026-09-03','version':1,'status':'published','note':'历史回溯','publishedAt':'2026-09-10T08:00:00Z','articles':[article]}
    def tearDown(self):self.local.stop();self.temp.cleanup()
    def test_escape_and_links(self):
        message,body=briefing.compose(self.edition,True)
        self.assertNotIn('<script>',body);self.assertIn('&lt;script&gt;',body)
        self.assertIn(briefing.SITE+'/news/',body);self.assertEqual(message['To'],briefing.MAIL)
        self.assertIn(self.edition['articles'][0]['sources'][0]['url'],body)
    def test_history_is_not_bulk_mailed(self):
        with self.assertRaisesRegex(RuntimeError,'历史补录'):briefing.send(self.edition)
    @patch.object(briefing,'read_secret',return_value='test-only')
    @patch.object(briefing.smtplib,'SMTP_SSL')
    def test_success_not_sent_twice(self,smtp,secret):
        briefing.send(self.edition,True);briefing.send(self.edition,True)
        self.assertEqual(smtp.return_value.__enter__.return_value.send_message.call_count,1)
    @patch.object(briefing,'read_secret',return_value='test-only')
    @patch.object(briefing.smtplib,'SMTP_SSL')
    def test_ambiguous_sending_is_not_retried(self,smtp,secret):
        smtp.return_value.__enter__.return_value.send_message.side_effect=TimeoutError()
        with self.assertRaisesRegex(RuntimeError,'不明确'):briefing.send(self.edition,True)
        briefing.send(self.edition,True)
        self.assertEqual(smtp.return_value.__enter__.return_value.send_message.call_count,1)
    @patch.object(briefing,'read_secret',return_value='test-only')
    @patch.object(briefing.smtplib,'SMTP_SSL')
    def test_known_failure_limited(self,smtp,secret):
        smtp.side_effect=ConnectionRefusedError()
        for _ in range(3):
            with self.assertRaisesRegex(RuntimeError,'连接'):briefing.send(self.edition,True)
        with self.assertRaisesRegex(RuntimeError,'上限'):briefing.send(self.edition,True)
        self.assertEqual(smtp.call_count,3)

if __name__=='__main__':unittest.main()
