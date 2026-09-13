import io
import os
import shutil
import tempfile
import unittest

from app import app


class TestStudyTreeApp(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.upload_dir = app.config["UPLOAD_FOLDER"]
        if os.path.exists(self.upload_dir):
            shutil.rmtree(self.upload_dir)
        os.makedirs(self.upload_dir, exist_ok=True)

    def tearDown(self):
        if os.path.exists(self.upload_dir):
            shutil.rmtree(self.upload_dir)

    def test_upload_document_local(self):
        response = self.client.post(
            '/api/document',
            data={
                'branche_id': 'root',
                'nom': 'Fichier test',
                'file': (io.BytesIO(b'hello'), 'test.txt')
            },
            content_type='multipart/form-data'
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['nom'], 'Fichier test')
        self.assertEqual(payload['source'], 'Fichier local')
        self.assertIn('/uploads/', payload['emplacement'])

        saved_name = payload['emplacement'].split('/uploads/')[-1]
        self.assertTrue(os.path.exists(os.path.join(self.upload_dir, saved_name)))
        self.assertEqual(len(os.listdir(self.upload_dir)), 1)

    def test_delete_document_local_removes_file(self):
        response = self.client.post(
            '/api/document',
            data={
                'branche_id': 'root',
                'nom': 'Fichier à supprimer',
                'file': (io.BytesIO(b'hello world'), 'delete-me.txt')
            },
            content_type='multipart/form-data'
        )

        payload = response.get_json()
        saved_name = payload['emplacement'].split('/uploads/')[-1]
        saved_path = os.path.join(self.upload_dir, saved_name)

        self.assertTrue(os.path.exists(saved_path))

        delete_response = self.client.delete(f"/api/document/{payload['id']}")

        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(os.path.exists(saved_path))


if __name__ == '__main__':
    unittest.main()
